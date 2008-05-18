var set_status = function(val) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator('navigator:browser'), win;
    while(enumerator.hasMoreElements()) {
	win = enumerator.getNext();
	var label = win.document.getElementById('magnolia-sync-panel');
	label.label = val;
	label.collapsed = false;
    }
};

var get_api_key = function() {
    var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    return prefManager.getCharPref('extensions.magnolia-sync.api-key');
}

var insert_bookmark = function(uri, title) {
    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService);

    var unfiledFolder = bmsvc.unfiledBookmarksFolder
	var newBkmkId = bmsvc.insertBookmark(unfiledFolder, uri, -1, title);
}

var get_all_bookmarks = function() {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService);
    var taggingSvc = Components.classes["@mozilla.org/browser/tagging-service;1"].getService(Components.interfaces.nsITaggingService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

    var url = 'http://ma.gnolia.com/api/rest/1/bookmarks_find?person=myself&limit=10&api_key=' + get_api_key();

    req.open('GET', url, true);
    req.onreadystatechange = function (aEvt) {
	if (req.readyState == 4) {
	    if (req.status == 200) {
		var doc = req.responseXML;
		var nodes = doc.getElementsByTagName('bookmark');
		set_status('Getting tags...');
		for (var i = 0; i < nodes.length; i++) {
		    var node = nodes[i];
		    var titleNode = node.getElementsByTagName('title');
		    var title = titleNode[0].textContent;
		    var urlNode = node.getElementsByTagName('url');
		    var url = urlNode[0].textContent;
		    var uri = ios.newURI(url, null, null);
		    if (!bmsvc.isBookmarked(uri)) {
			insert_bookmark(uri, title);
		    }
		    var oldtags = new Array();
		    oldtags = taggingSvc.getTagsForURI(uri, oldtags);
		    var tags = node.getElementsByTagName('tag');
		    if (tags.length > 0) {
			var newtags = new Array(tags.length);
			for (var j = 0; j < tags.length; j++) {
			    var tag = tags[j].getAttribute('name').toLowerCase();
			    newtags[j] = tag;
			    idx = oldtags.indexOf(tag);
			    if (idx >= 0) {
				var last = oldtags.pop();
				if (idx < oldtags.length) {
				    oldtags[idx] = last;
				}
			    }
			}
			taggingSvc.tagURI(uri, newtags);
		    }
		    if (oldtags.length > 0) {
			taggingSvc.untagURI(uri, oldtags);
		    }
		} 
		set_status(nodes.length);
		alert('done');
	    }
	    else
		alert("Error loading page\n");
	}
    };
    req.send(null); 
}

