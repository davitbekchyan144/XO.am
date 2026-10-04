require 'json'
require 'securerandom'
require 'socket'
require 'webrick'

class ArenaServer
  ROOT = File.expand_path(__dir__)
  WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ].freeze

  def initialize
    @rooms = {}
    @mutex = Mutex.new
  end

  def mount(server)
    server.mount_proc('/') do |request, response|
      route(request, response)
    rescue JSON::ParserError
      json_response(response, 400, error: 'Invalid JSON request.')
    rescue StandardError => error
      warn "Arena server error: #{error.class}: #{error.message}"
      json_response(response, 500, error: 'The server could not complete that request.')
    end
  end

  private

  def route(request, response)
    if request.path == '/api/health' && request.request_method == 'GET'
      json_response(response, 200, online: true)
    elsif request.path == '/api/players' && request.request_method == 'GET'
      search_players(request, response)
    elsif request.path == '/api/rooms' && request.request_method == 'POST'
      create_room(request, response)
    elsif (match = request.path.match(%r{\A/api/rooms/([A-Z0-9]{6})/(join|events|move|reset|leave)\z}))
      route_room_request(request, response, match[1], match[2])
    else
      serve_static(request, response)
    end
  end

  def route_room_request(request, response, code, action)
    case [request.request_method, action]
    when ['POST', 'join'] then join_room(request, response, code)
    when ['GET', 'events'] then poll_room(request, response, code)
    when ['POST', 'move'] then move(request, response, code)
    when ['POST', 'reset'] then reset_room(request, response, code)
    when ['POST', 'leave'] then leave_room(request, response, code)
    else json_response(response, 405, error: 'That action is not available.')
    end
  end

  def create_room(request, response)
    name = player_name(parse_body(request)['displayName'])
    result = @mutex.synchronize do
      code = SecureRandom.alphanumeric(6).upcase
      code = SecureRandom.alphanumeric(6).upcase while @rooms.key?(code)
      player_id = SecureRandom.hex(16)
      @rooms[code] = {
        players: [{ id: player_id, name: name, mark: 'X' }],
        board: Array.new(9, ''),
        current_player: 'X',
        status: 'waiting',
        winner: nil,
        round: 1,
        revision: 1
      }
      { roomCode: code, playerId: player_id, mark: 'X' }
    end
    json_response(response, 201, result)
  end

  def search_players(request, response)
    query = request.query['q'].to_s.strip.downcase
    exclude = request.query['exclude'].to_s.strip.downcase
    players = @mutex.synchronize do
      @rooms.each_with_object([]) do |(code, room), available|
        next unless room[:status] == 'waiting'

        host = room[:players].first
        next if host[:name].downcase == exclude
        next unless query.empty? || host[:name].downcase.include?(query)

        available << { displayName: host[:name], roomCode: code }
      end.first(30)
    end
    json_response(response, 200, players: players)
  end

  def join_room(request, response, code)
    name = player_name(parse_body(request)['displayName'])
    result = @mutex.synchronize do
      room = @rooms[code]
      return json_response(response, 404, error: 'Room not found. Check the code and try again.') unless room
      return json_response(response, 409, error: 'This room already has two players or has ended.') unless room[:status] == 'waiting'

      player_id = SecureRandom.hex(16)
      room[:players] << { id: player_id, name: name, mark: 'O' }
      room[:status] = 'playing'
      room[:revision] += 1
      { roomCode: code, playerId: player_id, mark: 'O' }
    end
    json_response(response, 200, result)
  end

  def poll_room(request, response, code)
    player_id = request.query['player_id']
    state = @mutex.synchronize do
      room = @rooms[code]
      return json_response(response, 404, error: 'Room not found.') unless room
      return json_response(response, 403, error: 'You are not a player in this room.') unless room[:players].any? { |player| player[:id] == player_id }

      state_for(room, player_id, code)
    end
    json_response(response, 200, state)
  end

  def move(request, response, code)
    payload = parse_body(request)
    player_id = payload['playerId']
    index = payload['index']
    result = @mutex.synchronize do
      room = @rooms[code]
      return json_response(response, 404, error: 'Room not found.') unless room
      player = room[:players].find { |candidate| candidate[:id] == player_id }
      return json_response(response, 403, error: 'You are not a player in this room.') unless player
      return json_response(response, 409, error: 'The match is not accepting moves.') unless room[:status] == 'playing'
      return json_response(response, 409, error: 'It is the other player’s turn.') unless player[:mark] == room[:current_player]
      return json_response(response, 422, error: 'Choose an empty square.') unless index.is_a?(Integer) && index.between?(0, 8) && room[:board][index].empty?

      room[:board][index] = player[:mark]
      winning_line = WINNING_COMBINATIONS.find { |line| line.all? { |cell| room[:board][cell] == player[:mark] } }
      if winning_line
        room[:status] = 'finished'
        room[:winner] = player[:mark]
      elsif room[:board].none?(&:empty?)
        room[:status] = 'finished'
        room[:winner] = 'draw'
      else
        room[:current_player] = player[:mark] == 'X' ? 'O' : 'X'
      end
      room[:revision] += 1
      room[:revision]
    end
    json_response(response, 200, revision: result)
  end

  def reset_room(request, response, code)
    player_id = parse_body(request)['playerId']
    result = @mutex.synchronize do
      room = @rooms[code]
      return json_response(response, 404, error: 'Room not found.') unless room
      return json_response(response, 403, error: 'You are not a player in this room.') unless room[:players].any? { |player| player[:id] == player_id }
      return json_response(response, 409, error: 'Finish the current round before starting another.') unless room[:status] == 'finished'

      room[:board] = Array.new(9, '')
      room[:current_player] = 'X'
      room[:winner] = nil
      room[:status] = 'playing'
      room[:round] += 1
      room[:revision] += 1
    end
    json_response(response, 200, revision: result)
  end

  def leave_room(request, response, code)
    player_id = parse_body(request)['playerId']
    @mutex.synchronize do
      room = @rooms[code]
      return json_response(response, 404, error: 'Room not found.') unless room
      return json_response(response, 403, error: 'You are not a player in this room.') unless room[:players].any? { |player| player[:id] == player_id }

      room[:status] = 'closed'
      room[:revision] += 1
    end
    json_response(response, 200, left: true)
  end

  def state_for(room, player_id, code)
    player = room[:players].find { |candidate| candidate[:id] == player_id }
    opponent = room[:players].find { |candidate| candidate[:id] != player_id }
    {
      roomCode: code,
      yourMark: player[:mark],
      opponentName: opponent && opponent[:name],
      board: room[:board],
      currentPlayer: room[:current_player],
      status: room[:status],
      winner: room[:winner],
      round: room[:round],
      revision: room[:revision]
    }
  end

  def parse_body(request)
    JSON.parse(request.body.to_s.empty? ? '{}' : request.body)
  end

  def player_name(value)
    value.to_s.gsub(/[[:cntrl:]]/, '').strip[0, 24].then { |name| name.empty? ? 'Player' : name }
  end

  def json_response(response, status, data)
    response.status = status
    response['Content-Type'] = 'application/json; charset=utf-8'
    response['Cache-Control'] = 'no-store'
    response.body = JSON.generate(data)
  end

  def serve_static(request, response)
    return json_response(response, 405, error: 'Method not allowed.') unless request.request_method == 'GET' || request.request_method == 'HEAD'

    path = request.path == '/' ? '/index.html' : request.path
    file = File.expand_path(File.join(ROOT, path.sub(%r{\A/}, '')))
    return json_response(response, 404, error: 'Not found.') unless file.start_with?("#{ROOT}/") && File.file?(file)

    response.status = 200
    response['Content-Type'] = WEBrick::HTTPUtils.mime_type(File.extname(file), WEBrick::HTTPUtils::DefaultMimeTypes)
    response['Cache-Control'] = 'no-cache'
    response.body = request.request_method == 'HEAD' ? '' : File.binread(file)
  end
end

port = Integer(ENV.fetch('PORT', '8000'))
server = WEBrick::HTTPServer.new(
  BindAddress: '0.0.0.0',
  Port: port,
  AccessLog: [],
  Logger: WEBrick::Log.new($stdout, WEBrick::Log::INFO)
)
ArenaServer.new.mount(server)
Socket.ip_address_list.select(&:ipv4?).reject(&:ipv4_loopback?).each do |address|
  puts "Open XO.am Arena on this network: http://#{address.ip_address}:#{port}"
end
puts "Local address: http://127.0.0.1:#{port}"
trap('INT') { server.shutdown }
server.start