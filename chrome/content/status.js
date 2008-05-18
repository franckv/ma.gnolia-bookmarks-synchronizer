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
};

var insert_bookmark = function(uri, title) {
    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService);

    var unfiledFolder = bmsvc.unfiledBookmarksFolder
	var newBkmkId = bmsvc.insertBookmark(unfiledFolder, uri, -1, title);
};

var update_bookmarks = function() {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

    var url = 'http://ma.gnolia.com/api/rest/1/bookmarks_find?person=myself&limit=10&api_key=' + get_api_key();

    document.getElementById('magnolia-sync-panel').setAttribute('src', 'chrome://magnolia-sync/content/loader.gif');
    //set_status('Updating bookmarks...');
    req.open('GET', url, true);
    req.onreadystatechange = function (aEvt) {
	if (req.readyState == 4) {
	    if (req.status == 200) {
		var doc = req.responseXML;
		var nodes = doc.getElementsByTagName('bookmark');
		var bmadded = 0;
		var bmupdated = 0;
		for (var i = 0; i < nodes.length; i++) {
		    var title = nodes[i].getElementsByTagName('title')[0].textContent;
		    var url  = nodes[i].getElementsByTagName('url')[0].textContent;
		    var created = nodes[i].getAttribute('created');
		    var updated = nodes[i].getAttribute('updated');
		    var uri = ios.newURI(url, null, null);
		    if (!bmsvc.isBookmarked(uri)) {
			var bmkid = insert_bookmark(uri, title);
			bmsvc.setItemDateAdded(bmkid, date_string_to_number(created));
			bmsvc.setItemLastModified(bmkid, date_string_to_number(updated));
			++bmadded;
		    }
		    else {
			++bmupdated;
		    }
		   
		    var tags = nodes[i].getElementsByTagName('tag');
		    tag_uri(uri, tags);
		    
		    var description  = nodes[i].getElementsByTagName('description')[0].textContent;
		    annotate_uri(uri, description);
		} 
		//set_status(nodes.length);
		document.getElementById('magnolia-sync-panel').setAttribute('src', 'chrome://magnolia-sync/content/icon.png');
		alert(bmadded + ' new bookmarks, ' + bmupdated + ' updated');
	    }
	    else
		alert("Error loading page\n");
	}
    };
    req.send(null); 
};

var date_string_to_number = function(datestr) {
    datestr = datestr.replace(/-/, '/');
    datestr = datestr.replace(/-/, '/');
    datestr = datestr.replace(/T/, ' ');

    return Date.parse(datestr) * 1000;
}

var tag_uri = function(uri, tags) {
    var taggingSvc = Components.classes["@mozilla.org/browser/tagging-service;1"].getService(Components.interfaces.nsITaggingService);

    var oldtags = new Array();
    oldtags = taggingSvc.getTagsForURI(uri, {});
    if (tags.length > 0) {
	var newtags = new Array(tags.length);
	for (var i = 0; i < tags.length; i++) {
	    var tag = tags[i].getAttribute('name').toLowerCase();
	    newtags[i] = tag;
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

};

var annotate_uri = function(uri, description) {
    var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"].getService(Components.interfaces.nsIAnnotationService);
    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService);

    var bmkids = bmsvc.getBookmarkIdsForURI(uri, {});
    for (var i = 0;i < bmkids.length; i++) {
	annotationService.setItemAnnotation(bmkids[i], 'bookmarkProperties/description', description, 0, 0);
    }
};

var open_preferences = function() {
    window.openDialog('chrome://magnolia-sync/content/options.xul', 'magnolia-sync', 'chrome,titlebar,toolbar,centerscreen,modal');
};

