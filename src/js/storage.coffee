class LocalStorage

  @get: (key, property, callback) ->
    value = localStorage.getItem(key)

    if value == null
      callback(value)
      return

    value = JSON.parse(value)

    if property == 'everything'
      callback(value)
    else
      callback(value[property])


  @set: (key, property, value, callback) ->

    data = JSON.parse(localStorage.getItem(key)) || {}

    if property == 'everything'
      data = value
    else
      data[property] = value

    data = JSON.stringify(data)
    localStorage.setItem(key, data)

    if callback
      callback()


class Storage

  constructor: () ->
    @syncKey = localStorage.getItem('sync_key')

    if @syncKey == null
      @syncEnabled = false
    else
      @syncEnabled = true

    shareCode = Utils.getUrlParameter('share')
    
    unless shareCode == undefined
      @dbKey = shareCode
      localStorage.setItem('sync_key', shareCode)
      @syncEnabled = true

    @createFirebase()
    @setSyncKey()


  get: (property, callback) ->
    LocalStorage.get(@dbKey, property, callback)


  set: (property, value, callback) ->
    LocalStorage.set(@dbKey, property, value, callback)


  getTasks: (callback) ->
    LocalStorage.get(@dbKey, 'tasks', callback)


  setTasks: (value, callback) ->
    @set('tasks', value, callback)
    @set('timestamp', Date.now(), callback)


  linkDevices: ->
    unless @syncEnabled
      @syncEnabled = true
      @createFirebase()
      @setSyncKey()

    Views.toggleModalDialog()

  
  createFirebase: ->
    if @syncEnabled
      @remote_ref = new Firebase('https://supersimpletasks.firebaseio.com/data/')


  migrateKey: (new_key) ->
    @get 'everything', (everything) =>
      @dbKey = new_key
      SST.storage.set 'everything', everything, () ->

      @dbKey


  setSyncKey: ->
    if @syncEnabled
      @dbKey = localStorage.getItem('sync_key')

      if @dbKey == null
        @dbKey = 'todo'

        new_key = Utils.generateID()

        @dbKey = @migrateKey(new_key)

        localStorage.setItem('sync_key', @dbKey)

        console.log 'Your sync key has been set to: ' + @dbKey

    else
      @dbKey = 'todo'


  disconnectDevices: ->
    localStorage.removeItem('sync_enabled')
    localStorage.removeItem('sync_key')

    @migrateKey('todo')
