var p, ITEM_TYPE_OF, SELECTOR_NUM, KEY_CODE, WEB_SEARCH_LIST, tabSelect, historySelect, bookmarkSelect, makeSelectorConsole, selectorAction, Popup, SelectorMode;
p = prelude;
ITEM_TYPE_OF = {
  tab: 'TAB',
  history: 'HIS',
  bookmark: 'BKM',
  websearch: 'WEB',
  command: 'COM'
};
SELECTOR_NUM = 20;
KEY_CODE = {
  MOVE_NEXT_SELECTOR_CURSOR: 40,
  MOVE_PREV_SELECTOR_CURSOR: 38
};
WEB_SEARCH_LIST = [
  {
    title: 'google検索',
    url: 'https://www.google.co.jp/#hl=ja&q=',
    type: 'websearch'
  }, {
    title: 'alc辞書',
    url: 'http://eow.alc.co.jp/search?ref=sa&q=',
    type: 'websearch'
  }
];
tabSelect = function(){
  var dfd;
  dfd = $.Deferred();
  chrome.tabs.query({
    currentWindow: true
  }, function(tabs){
    var e;
    return dfd.resolve((function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = tabs).length; i$ < len$; ++i$) {
        e = ref$[i$];
        results$.push({
          id: e.id,
          title: e.title,
          url: e.url,
          type: 'tab'
        });
      }
      return results$;
    }()));
  });
  return dfd.promise();
};
historySelect = function(){
  var dfd;
  dfd = $.Deferred();
  chrome.history.search({
    text: '',
    maxResults: 1000
  }, function(hs){
    var e;
    return dfd.resolve((function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = hs).length; i$ < len$; ++i$) {
        e = ref$[i$];
        results$.push({
          id: e.id,
          title: e.title,
          url: e.url,
          type: 'history'
        });
      }
      return results$;
    }()));
  });
  return dfd.promise();
};
bookmarkSelect = function(){
  var dfd;
  dfd = $.Deferred();
  chrome.bookmarks.search("h", function(es){
    var e;
    return dfd.resolve((function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = es).length; i$ < len$; ++i$) {
        e = ref$[i$];
        if (e.url != null) {
          results$.push({
            id: e.id,
            title: e.title,
            url: e.url,
            type: 'bookmark'
          });
        }
      }
      return results$;
    }()));
  });
  return dfd.promise();
};
makeSelectorConsole = function(list){
  var ts, t;
  if ($('#selectorList')) {
    $('#selectorList').remove();
  }
  console.log(list);
  ts = p.concat(p.take(SELECTOR_NUM, (function(){
    var i$, ref$, len$, results$ = [];
    for (i$ = 0, len$ = (ref$ = list).length; i$ < len$; ++i$) {
      t = ref$[i$];
      results$.push('<tr id="' + t.type + '-' + t.id + '"><td><span class="title">[' + ITEM_TYPE_OF[t.type] + '] ' + t.title + ' </span><span class="url"> ' + t.url + '</span></td></tr>');
    }
    return results$;
  }())));
  $('#selectorConsole').append('<table id="selectorList">' + ts + '</table>');
  return $('#selectorList tr:first').addClass("selected");
};
selectorAction = function(item){
  console.log(item);
  switch (item.type) {
  case "tab":
    console.log('tabs.update');
    return chrome.tabs.update(parseInt(item.id), {
      active: true
    });
  case "websearch":
    console.log('web search');
    return chrome.tabs.create({
      url: item.url + item.query
    });
  default:
    return chrome.tabs.create({
      url: item.url
    });
  }
};
Popup = (function(){
  Popup.displayName = 'Popup';
  var prototype = Popup.prototype, constructor = Popup;
  constructor.list = [];
  function Popup(){}
  return Popup;
}());
SelectorMode = (function(){
  SelectorMode.displayName = 'SelectorMode';
  var prototype = SelectorMode.prototype, constructor = SelectorMode;
  SelectorMode.keyupMap = function(e){
    constructor.keyUpSelectorFiltering(e);
    return e.preventDefault();
  };
  SelectorMode.keydownMap = function(e){
    switch (e.keyCode) {
    case KEY_CODE.MOVE_NEXT_SELECTOR_CURSOR:
      return constructor.keyDownSelectorCursorNext(e);
    case KEY_CODE.MOVE_PREV_SELECTOR_CURSOR:
      return constructor.keyDownSelectorCursorPrev(e);
    default:
      return function(){
        return alert(e.keyCode);
      };
    }
  };
  SelectorMode.keyUpSelectorFiltering = function(e){
    var filtering, text;
    if (e.keyCode < 65 || e.keyCode > 90) {
      return false;
    }
    filtering = function(text, list){
      var matchP;
      matchP = function(elem, queries){
        var q;
        return p.all(p.id, (function(){
          var i$, ref$, len$, results$ = [];
          for (i$ = 0, len$ = (ref$ = queries).length; i$ < len$; ++i$) {
            q = ref$[i$];
            results$.push(elem.title.toLowerCase().search(q) !== -1 || elem.url.toLowerCase().search(q) !== -1 || ITEM_TYPE_OF[elem.type].toLowerCase().search(q) !== -1);
          }
          return results$;
        }()));
      };
      return p.filter(function(t){
        return matchP(t, text.toLowerCase().split(' '));
      }, list);
    };
    console.log('keyUpSelectorFiltering');
    text = $('#selectorInput').val();
    makeSelectorConsole(filtering(text, Popup.list).concat(WEB_SEARCH_LIST));
    return $('#selectorConsole').show();
  };
  SelectorMode.keyDownSelectorCursorNext = function(e){
    console.log('keyDownSelectorCursorNext');
    $('#selectorList .selected').removeClass("selected").next("tr").addClass("selected");
    return e.preventDefault();
  };
  SelectorMode.keyDownSelectorCursorPrev = function(e){
    console.log('keyDownSelectorCursorPrev');
    $('#selectorList .selected').removeClass("selected").prev("tr").addClass("selected");
    return e.preventDefault();
  };
  SelectorMode.keyUpSelectorDecide = function(){
    var ref$, type, id, url, query;
    console.log('keyUpSelectorDecide');
    ref$ = $('#selectorList tr.selected').attr('id').split('-'), type = ref$[0], id = ref$[1];
    url = $('#selectorList tr.selected span.url').text();
    query = $('#selectorInput').val();
    selectorAction({
      id: id,
      url: url,
      type: type,
      query: query
    });
    $('#selectorInput').val('');
    return false;
  };
  function SelectorMode(){}
  return SelectorMode;
}());
$(function(){
  $(document).keyup(function(e){
    return SelectorMode.keyupMap(e);
  });
  $(document).keydown(function(e){
    return SelectorMode.keydownMap(e);
  });
  $('body').on('submit', '#selectorForm', SelectorMode.keyUpSelectorDecide);
  return $.when(tabSelect(), historySelect(), bookmarkSelect()).done(function(ts, hs, bs){
    Popup.list = ts.concat(hs, bs);
    return makeSelectorConsole(Popup.list);
  });
});