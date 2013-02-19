p = prelude

ITEM_TYPE_OF = {tab: 'TAB', history: 'HIS', bookmark: 'BKM', websearch: 'WEB', command: 'COM'}
SELECTOR_NUM = 20

KEY_CODE =
  MOVE_NEXT_SELECTOR_CURSOR: 40 # down
  MOVE_PREV_SELECTOR_CURSOR: 38 # up

WEB_SEARCH_LIST =
  {title: 'google検索', url: 'https://www.google.co.jp/#hl=ja&q=', type: 'websearch'}
  {title: 'alc辞書', url: 'http://eow.alc.co.jp/search?ref=sa&q=', type: 'websearch'}

tabSelect =->
  dfd = $.Deferred()
  chrome.tabs.query({currentWindow: true}, (tabs) ->
    dfd.resolve([{id: e.id, title: e.title, url: e.url, type: 'tab'} for e in tabs])
  )
  dfd.promise()

historySelect =->
  dfd = $.Deferred()
  chrome.history.search({text:'', maxResults: 1000}, (hs) ->
    dfd.resolve([{id: e.id, title: e.title, url: e.url, type: 'history'} for e in hs])
  )
  dfd.promise()

bookmarkSelect =->
  dfd = $.Deferred()
  chrome.bookmarks.search("h", (es) ->
    dfd.resolve([{id: e.id, title: e.title, url: e.url, type: 'bookmark'} for e in es when e.url?])
  )
  dfd.promise()

# (tab|history|bookmark|,,,)のリストをうけとりそれをhtmlにしてappendする
# makeSelectorConsole :: [{title, url, type}] -> IO Jquery
makeSelectorConsole = (list) ->
  if $('#selectorList') then $('#selectorList').remove()
  console.log(list)
  ts = p.concat(
    p.take(SELECTOR_NUM,
           ['<tr id="' + t.type + '-' + t.id + '"><td><span class="title">['+ ITEM_TYPE_OF[t.type] + '] ' + t.title + ' </span><span class="url"> ' + t.url + '</span></td></tr>' for t in list]))
  $('#selectorConsole').append('<table id="selectorList">' + ts + '</table>')
  $('#selectorList tr:first').addClass("selected")


selectorAction = (item) ->
  console.log(item)
  switch item.type
  case "tab"
    console.log('tabs.update')
    chrome.tabs.update(parseInt(item.id), {active: true})
  case "websearch"
    console.log('web search')
    chrome.tabs.create({url: item.url + item.query})
  default
    chrome.tabs.create({url: item.url})


class Popup
  @@list = []

class SelectorMode
  @keyupMap = (e) ->
    @@keyUpSelectorFiltering(e)
    e.preventDefault()

  @keydownMap = (e) ->
    switch e.keyCode
    case KEY_CODE.MOVE_NEXT_SELECTOR_CURSOR then @@keyDownSelectorCursorNext(e)
    case KEY_CODE.MOVE_PREV_SELECTOR_CURSOR then @@keyDownSelectorCursorPrev(e)
    default (-> alert(e.keyCode))

  @keyUpSelectorFiltering = (e) ->
    return false if e.keyCode < 65 or e.keyCode > 90

    # 受け取ったテキストをスペース区切りで分割して、その要素すべてが(tab|history|bookmark)のtitleかtabのurlに含まれるtabのみ返す
    # filtering :: String -> [{title, url, type}] -> [{title, url, type}]
    filtering = (text, list) ->
      # queriesのすべての要素がtitleかurlに見つかるかどうかを返す
      # titleAndUrlMatch :: Elem -> [String] -> Bool
      matchP = (elem, queries) ->
        p.all(p.id, [elem.title.toLowerCase().search(q) isnt -1 or
                     elem.url.toLowerCase().search(q) isnt -1 or
                     ITEM_TYPE_OF[elem.type].toLowerCase().search(q) isnt -1 for q in queries])
      p.filter(((t) -> matchP(t, text.toLowerCase().split(' '))), list)

    console.log('keyUpSelectorFiltering')
    text = $('#selectorInput').val()
    makeSelectorConsole(filtering(text, Popup.list).concat(WEB_SEARCH_LIST))
    $('#selectorConsole').show()

  @keyDownSelectorCursorNext = (e) ->
    console.log('keyDownSelectorCursorNext')
    $('#selectorList .selected').removeClass("selected").next("tr").addClass("selected")
    e.preventDefault()

  @keyDownSelectorCursorPrev = (e) ->
    console.log('keyDownSelectorCursorPrev')
    $('#selectorList .selected').removeClass("selected").prev("tr").addClass("selected")
    e.preventDefault()

  @keyUpSelectorDecide =->
    console.log('keyUpSelectorDecide')
    [type, id] = $('#selectorList tr.selected').attr('id').split('-')
    url = $('#selectorList tr.selected span.url').text()
    query = $('#selectorInput').val()
    selectorAction({id: id, url: url, type: type, query: query})
    $('#selectorInput').val('')
    false


$(->
  $(document).keyup((e) -> SelectorMode.keyupMap(e))
  $(document).keydown((e) -> SelectorMode.keydownMap(e))
  $('body').on('submit', '#selectorForm', SelectorMode.keyUpSelectorDecide)

  $.when(tabSelect(), historySelect(), bookmarkSelect()).done((ts, hs, bs) ->
    Popup.list = ts.concat(hs, bs)
    makeSelectorConsole(Popup.list)
  )
)