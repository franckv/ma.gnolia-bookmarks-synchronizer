/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is magnoliasync.
 *
 * The Initial Developer of the Original Code is
 * Franck.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */


var set_status = function(val) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator('navigator:browser'), win;
    while(enumerator.hasMoreElements()) {
	win = enumerator.getNext();
	var label = win.document.getElementById('magnoliasync-panel');
	label.label = val;
	label.collapsed = false;
    }
};

var get_api_key = function() {
    var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    return prefManager.getCharPref('extensions.magnoliasync.api-key');
};

var insert_bookmark = function(uri, title) {
    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService);

    var unfiledFolder = bmsvc.unfiledBookmarksFolder
	var newBkmkId = bmsvc.insertBookmark(unfiledFolder, uri, -1, title);
};

var update_bookmarks = function() {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();

    var todate = null;

    document.getElementById('magnoliasync-panel').setAttribute('src', 'chrome://magnoliasync/content/loader.gif');
    //set_status('Updating bookmarks...');
    var findurl = 'http://ma.gnolia.com/api/rest/1/bookmarks_find?person=myself&api_key=' + get_api_key();
    req.open('GET', findurl, true);
    req.onreadystatechange = function() {handleRequest(req);};
    req.send(null); 
};

var handleRequest = function(req) {
    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    try {
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
		    todate = created;
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
		if (nodes.length == 500 && todate != null) {
		    var findurl = 'http://ma.gnolia.com/api/rest/1/bookmarks_find?person=myself&api_key=' + get_api_key();
		    req.open('GET', findurl + '&to=' + todate);
		    req.onreadystatechange = function() {handleRequest(req);};
		    req.send(null); 
		}
		else {
		    document.getElementById('magnoliasync-panel').setAttribute('src', 'chrome://magnoliasync/content/icon.png');
		}
		//set_status(nodes.length);
	    }
	    else {
		alert("Error loading page: " + req.status);
		document.getElementById('magnoliasync-panel').setAttribute('src', 'chrome://magnoliasync/content/icon.png');
	    }
	}
    } catch(e) {
	alert("Error loading page: " + e);
	document.getElementById('magnoliasync-panel').setAttribute('src', 'chrome://magnoliasync/content/icon.png');
    }
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
    window.openDialog('chrome://magnoliasync/content/options.xul', 'magnoliasync', 'chrome,titlebar,toolbar,centerscreen,modal');
};

