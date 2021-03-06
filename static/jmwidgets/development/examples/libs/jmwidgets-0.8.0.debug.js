/*!
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 	// css caching
window.$hmicss = [];

var hmiMgr = function (selector) {
    // use jquery's approach to create an object for each selector
    return new hmiMgr.fn.init(selector);
};
hmiMgr.xforms = {};
hmiMgr.activePage = null;
hmiMgr.wgts = {};
hmiMgr.activeTagMgrs = [];
hmiMgr.activePagePrefixes = [];
hmiMgr.isInited = false;
hmiMgr.globalMouse = false;
hmiMgr.fx = {};

	// this method caches a css parameter for a widget
hmiMgr.cacheCSS = function (strClass, valueMap) {
	var cacheVal = window.$hmicss[strClass];
		// if cached value aready exists, append to it
	if (cacheVal) {
		for (i in valueMap) {
			cacheVal[i] = valueMap[i];
		}		
	} else {
		window.$hmicss[strClass] = valueMap;
	}
}

// this method inialized the mouse handlers for the page
// needs to be called after document is loaded
hmiMgr.init = function () {
    // only init once
    if (this.isInited === false) {
        this.mouseMgr.init();
		this.globalMouse = true;
        // disable highlighting in webkit (selection flash)
        document.documentElement.style.webkitTapHighlightColor = "rgba(0,0,0,0)";
        // disable image save in webkit
        document.documentElement.style.webkitTouchCallout = "none";
        // disable save dialog when tap held down
        document.documentElement.style.webkitUserSelect = "none";
        this.isInited = true;
    }
};

// finds the widget in the set of page
hmiMgr.getWidget = function (wgtId) {
    var retWgt = null;

    // first check if widget is in the active page
    if (this.activePage)
        retWgt = this.activePage.getWidget(wgtId);
    if (!retWgt && this.wgts && this.wgts.length>0) {
        // next check the global widgets
        retWgt = this.wgts[wgtId];
        if (!retWgt) {
            // if not in global space, check all pages
            for (i in this.wgts) {
                if (this.wgts[i].getWidget) retWgt = this.wgts[i].getWidget(wgtId);
                if (retWgt) break;
            }
        }
    }
    	// use jquery to get the widget (for jmwidgets support)
    if (!retWgt) {
    	retWgt = $("#"+wgtId).data('hmiWgt');
    }
    	
    return retWgt;
};
// add widget to the lst based on the namespace
hmiMgr.addWidget = function (id, wgtObj) {
    if (wgtObj && wgtObj.wgtPage) {
        wgtObj.wgtPage.addWidget(id, wgtObj);
    } else {
        this.wgts[id] = wgtObj;
    }
};
// store hmi widgets with a div element if we are using namespaces
hmiMgr.setActivePage = function (pageWgt) {
    this.activePage = pageWgt;
};
hmiMgr.setActiveTagMgrs = function (activeTagMgr) {
    this.activeTagMgrs.push(activeTagMgr);
};
hmiMgr.setActiveTagMgrsEmpty = function () {
    this.activeTagMgrs.length = 0
};
hmiMgr.setActivePagePrefixes = function (prefix) {
    if ($.trim(prefix) !== '' && $.inArray(prefix, this.activePagePrefixes) === -1) {
        this.activePagePrefixes.push(prefix);
    }
};
hmiMgr.setActivePagePrefixesEmpty = function (prefix) {
    this.activePagePrefixes.length = 0;
};

hmiMgr.actionMgr = {
    actions : [],
    que     : [],
    execute : function (objAction, params, wgtId, strAction) {
        var me = this;
        var numElems = this.que.push(function () {
            objAction.addActionListener(me);
            objAction.execute(wgtId, params, strAction);
        });
        // if this is the first item in the que, execute it
        //  it will get removed from the que when it is done
        if (numElems === 1) {
            if (typeof this.que[0] === 'function') {
                (this.que[0])();
            }
        }
    },
    done: function () {
        //console.log("Action Done");
        // remove the current action from the que
        this.que.shift();
        // if we have more in the que, execute them
        if (this.que.length > 0) {
            //Do the action only if the function is available
            if (typeof this.que[0] === 'function') {
                (this.que[0])();
            }
        }
    }
};
// mouse handling methods
hmiMgr.handleMouse = function (wgt) {
    // set the new capture
    this.mouseMgr.mouseWgt = wgt;
};
hmiMgr.mouseMgr = {
    startX         : 0,
    startY         : 0,
    scrollLeft     : 0,
    scrollTop      : 0,
    mouseWgt       : null,
    wgtPagePos	   : {left:0, top:0},
    wgtIsMouseDown : false,
    init           : function () {
        // needed to handle mouse capture correctly
        var me = this;
        $(document).mousedown(function (e) {
            me.doMouseDown(e);
        });
        $(document).mouseup(function (e) {
            me.doMouseUp(e);
        });
        $(document).mousemove(function (e) {
            var bHandled = me.doMouseMove(e);
            if (!bHandled && this.wgtIsMouseDown) me.doPageScroll(e);
        });
        //Touch events needs here especially the iPad loads the web part in it
        if ('ontouchstart' in window && 'ontouchend' in document) {
            $(document).mousemove(function (e) {
                me.doMouseMove(e);
            });
            //Touch events
            $(document).bind("touchstart", function (event) {
                me.doMouseDown(event);
            });
            $(document).bind("touchend", function (event) {
                me.doMouseUp(event);
            });
            $(document).bind("touchcancel", function (event) {
                me.doMouseUp(event);
            });
            $(document).bind("touchmove", function (event) {
                me.doMouseMove(event);
                /*var bHandled = me.doMouseMove(event);
                 if (!bHandled) {
                 me.doPageScroll(event);
                 }*/
            });
        }
    },
    doMouseDown    : function (e) {
        var evt;
        if (e && e.originalEvent && typeof e.originalEvent.touches === "object") {
            if (e.originalEvent.touches.length <= 0) return;
            evt = e.originalEvent.touches[0];
        } else {
            evt = e || event;
        }
        var mouseWgt = this.mouseWgt;
        var evtTgt = evt.target || evt.srcElement;
        this.startY = evt.pageY;
        this.startX = evt.pageX;
        this.wgtIsMouseDown = true;
        if (mouseWgt != null) {
            if (e && e.preventDefault) e.preventDefault(); // need to disable dragging in Firefox and safari
            var objPos = $hmi.wgtPagePos(evtTgt);
            wgtClickCx = evt.pageX ? evt.pageX + this.scrollLeft - objPos.left : (evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft) - objPos.left;
            wgtClickCy = evt.pageY ? evt.pageY + this.scrollTop - objPos.top : (evt.clientY + document.body.scrollTop + document.documentElement.scrollTop) - objPos.top;
            this.wgtPagePos = $hmi.wgtPagePos(mouseWgt.elem);
            // handle internal routine
            if (mouseWgt.doMouseDown) {
                var evtInfo = this.wgtEventInfo(mouseWgt, e);
                mouseWgt.doMouseDown(evtInfo, e); //Sending the original event object too
            }
            // handle actions attached to the widget
            if (mouseWgt && mouseWgt.onMousePress) {
                var lstActionFuncs = mouseWgt.onMousePress.split(';');
                for (var i = 0; i < lstActionFuncs.length; i++) {
                    $hmi.doAction(mouseWgt.wgtId, lstActionFuncs[i]);
                }
            }
        }
    },
    doMouseUp: function (e) {
        if (e) {
            e.stopPropagation();
        }
        this.wgtIsMouseDown = false;
        if (this.mouseWgt != null) {
            var wgt = this.mouseWgt;
            // release capture
            this.mouseWgt = null; // set this first incase there is an exception in the action
            // handle internal routine
            if (wgt.doMouseUp) {
                var evtInfo = this.wgtEventInfo(wgt, e);
                wgt.doMouseUp(evtInfo, e); //Sending the original event object too
            }
            if (wgt && wgt.onMouseRelease) {
                // multiple functions are separated by a ;
                var lstActionFuncs = wgt.onMouseRelease.split(';');
                for (var i = 0; i < lstActionFuncs.length; i++) {
                    $hmi.doAction(wgt.wgtId, lstActionFuncs[i]);
                }
            }
        }
    },
    doMouseMove: function (e) {
        var bHandled = false;
        var evt;
        var mouseWgt = this.mouseWgt;
        if (mouseWgt != null) {
            if (e && e.originalEvent && typeof e.originalEvent.touches === "object") {
                if (e.originalEvent.touches.length <= 0) return;
                evt = e.originalEvent.touches[0];
            } else {
                evt = e || event;
            }
            if (e && e.preventDefault) e.preventDefault(); // need to disable dragging in Firefox
            var wgt = mouseWgt;
            if (mouseWgt.doMouseMove) {
                var evtInfo = this.wgtEventInfo(mouseWgt, e);
                mouseWgt.doMouseMove(evtInfo, e); //Sending the original event object too);
                bHandled = true;
            }
            //Studio does not support onmouseMove event. So commenting the following section
            /*if (wgt && wgt.onMouseMove) {
             // multiple functions are separated by a ;
             actionFuncs = wgt.onMouseMove.split(';');
             for (var i = 0; i < actionFuncs.length; i++) {
             this.doAction(wgt.wgtId, actionFuncs[i]);
             }
             }*/
        }
        return bHandled;
    },
    doPageScroll: function (e) {
        if (e && e.originalEvent && typeof e.originalEvent.touches === "object") {
            if (e.originalEvent.touches.length <= 0) return;
            evt = e.originalEvent.touches[0];
        } else {
            evt = e || event;
        }
        if (e && e.preventDefault) e.preventDefault(); // need to disable dragging in Firefox
        var posX = evt.pageX;
        var posY = evt.pageY;
        var pageBlock = document.getElementById("pageBlock");
        if (pageBlock) {
            var topY = pageBlock.scrollLeft;
            var topX = pageBlock.scrollTop;
            var scrollX = topY - (posX - this.startX);
            var scrollY = topX - (posY - this.startY);
            if (scrollX != 0) $(pageBlock).scrollLeft(scrollX);
            if (scrollY != 0) $(pageBlock).scrollTop(scrollY);
            this.scrollLeft = pageBlock.scrollLeft;
            this.scrollTop = pageBlock.scrollTop;
        }
        this.startY = posY;
        this.startX = posX;
    },
    wgtEventInfo: function (obj, e) {
        var evt;
        var evtTgt;
        if (e && e.originalEvent && typeof e.originalEvent.touches === "object") {
            if (e.originalEvent.touches.length <= 0) return;
            evt = e.originalEvent.touches[0];
            evtTgt = evt.target;
        } else {
            evt = e || event;
            evtTgt = evt.srcElement || evt.target;
        }

        var posx = 0;
        var posy = 0;
        if ((evt.pageX!==undefined) || (evt.pageY!==undefined)) {
            posx = evt.pageX + this.scrollLeft;
            posy = evt.pageY + this.scrollTop;
        } else if ((evt.clientX!==undefined) || (evt.clientY!==undefined)) {
            posx = evt.clientX + this.scrollLeft + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = evt.clientY + this.scrollTop + document.body.scrollTop + document.documentElement.scrollTop;
        }
			// wgtPagePos is set in the doMouseDown method
        var localX = posx - this.wgtPagePos.left;
        var localY = posy - this.wgtPagePos.top;
/*        
        if (obj) {
            if (obj.pageX!==undefined) localX = posx - obj.pageX;
            if (obj.pageY!==undefined) localY = posy - obj.pageY;	         	
        }
*/
         	// check if we are in a child elem.  If so assume it is the thumb element
		var inThumb = false;
		var thmbCx =0,
        	thmbCy=0;
		if (obj.elem != evtTgt) {
            if (obj.elem == evtTgt.parentNode) {
            	 inThumb = true;
            	 	// determine click position within the thumb
            	 if (evtTgt.offsetLeft!==undefined) thmbCx = localX - evtTgt.offsetLeft;
            	 if (evtTgt.offsetTop!==undefined) thmbCy = localY - evtTgt.offsetTop;
            }
        }       
        return {
            wgt: obj,
            isInThumb: inThumb,
            isMouseDown: this.wgtIsMouseDown,
            pageX: posx,
            pageY: posy,
            x: localX,
            y: localY,
            cx: thmbCx,
            cy: thmbCy
        };
    },
};
hmiMgr.scrubId = function (selector) {
    var wgtId = selector;
    // only supports '#' for now
    if (selector.indexOf("#") == 0) {
        wgtId = selector.substring(1, selector.length);
    }
    return wgtId;
};
hmiMgr.wgtPagePos = function (obj) {
    var curleft = 0;
    var curtop = 0;
    do {
        curleft += obj.offsetLeft;
        curtop += obj.offsetTop;
        obj = obj.offsetParent;
    } while (obj && (obj.nodeName != 'BODY'));
    return {
        left : curleft,
        top  : curtop
    };
};
// add widget to the lst based on the namespace
hmiMgr.addAction = function (id, actionObj) {
    this.actionMgr.actions[id] = actionObj;
};
// return an xform
hmiMgr.getAction = function (id) {
    return this.actionMgr.actions[id];
};
// add widget to the lst based on the namespace
hmiMgr.doAction = function (wgtId, strAction) {
    var delim = "js:";
    var isJS = (strAction.indexOf(delim) >= 0) ? true : false;
    if (isJS) strAction = strAction.split(delim)[1];
    var idx1 = strAction.indexOf("(");
    var idx2 = strAction.indexOf(")");
    var params = [];
    if (idx1 > 0) {
        var actionName = strAction.substring(0, idx1);
        var strParams = strAction.substring(idx1 + 1, idx2);
        params = strParams.split(",");
        if (actionName != null) {
            if (isJS) {
                var objAction = this.actionMgr.actions['JS'];
                if (objAction) {
                    this.actionMgr.execute(objAction, params, wgtId, actionName);
                }
            } else {
                var objAction = this.actionMgr.actions[actionName];
                if (objAction) {
                    this.actionMgr.execute(objAction, params, wgtId, actionName);
                }
            }
        }
    }
};
// add xform to the lst based on the namespace
hmiMgr.addXform = function (id, xformObj) {
    this.xforms[id] = xformObj;
};
// return an xform
hmiMgr.getXform = function (id) {
    return this.xforms[id];
};
// add special effect to the list
hmiMgr.addFx = function (id, fxOb) {
    this.fx[id] = fxOb;
};
// return an effect
hmiMgr.getFx = function (id) {
    return this.fx[id];
};
// create a data link
hmiMgr.createDataLink = function (tgtWgt, dataSrcWgt, tagProps) {
    var dataLink = new hmiDataLink();
    if (tagProps != null) {
        dataLink.dataSrc = dataSrcWgt;
        dataLink.dataSrcId = dataSrcWgt.wgtId;
        dataLink.tgtWgt = tgtWgt;
        if (tagProps.tag != undefined) dataLink.tag = tagProps.tag;
        if (tagProps.rw != undefined) dataLink.rw = tagProps.rw;
        if (tagProps.attr != undefined) dataLink.attr = tagProps.attr;
        if (tagProps.xforms != undefined) dataLink.addXform(tagProps.xforms);
    }
    return dataLink;
};
hmiMgr.addPagePrefixId = function (wgtId) {
    if (this.activePage) {
        wgtId = this.activePage + "_" + wgtId;
    }
    return wgtId;
};

hmiMgr.parseOptions = function (strOptions) {
	var value, name;
	var opts = { };
	strOptions = strOptions.replace(/['"<>!]/g,''); 
	strOptions = strOptions.replace(/--/g,''); 
    var optLst = strOptions.split(',');
    for (var i=0; i<optLst.length; i++) {
   		parts = optLst[i].split(':');
   		if (parts.length>=2) {
	   		name = parts[0].trim();
	   		value = parts[1].trim();
	   		num = parseFloat(value);
	   		if (isNaN(num))
	    		opts[name] = value;
	    	else
	    		opts[name] = num;
	    }
    }
    return opts;
};

hmiMgr.fn = hmiMgr.prototype = {
    constructor: hmiMgr,
    init: function (selector) {
        if (selector != undefined) {
            // check if widget passed in as a selector
            if (selector.wgtId) {
                this.wgtId = selector.wgtId;
                this.hmiWgt = selector;
            } else {
                this.wgtId = $hmi.scrubId(selector);
                this.hmiWgt = $hmi.getWidget(this.wgtId);
            }
            this.hmiElem = null; // do not initialize yet (not sure if it is needed yet)	
        }
    },
    widget: function () {
        return this.hmiWgt;
    },
    // attaches a datalink to the widget
    hmiAttach: function (dataSrcId, tagOptions) {
        if (tagOptions != null) {
            var dataSrcWgt = $hmi.getWidget(dataSrcId);
            if (dataSrcWgt && this.hmiWgt) {
                var dataLink = $hmi.createDataLink(this.hmiWgt, dataSrcWgt, tagOptions);
                // connect the widget and the data source
                this.hmiWgt.addDataLink(dataLink);
                dataSrcWgt.addDataLink(dataLink);
            }
        }
    },
    trigger: function (type) {
        // forward to the wiget
        if (this.hmiWgt) this.hmiWgt.trigger(type);
    },
    bind: function (type) {
        // forward to the wiget
        if (this.hmiWgt) this.hmiWgt.bind(type);
    },
    getValue: function (tag) {
        if (this.hmiWgt) return this.hmiWgt.getValue(tag);
        else return null;
    },
    setValue: function (tag, newValue) {
        if (this.hmiWgt) this.hmiWgt.setValue(tag, newValue);
    },
    findPageElem: function (elem) {
        // check all parent nodes until we find a parent with hmi-page class
        var pageElem = null;
        if (elem.tag == "body") {
            pageElem = null;
        } else if (elem.className && elem.className.indexOf("hmi-page") !== -1) {
            pageElem = elem;
        } else {
            pageElem = this.findPageElem(elem.getParentNode());
        }
        return pageElem;
    }
};
hmiMgr.fn.init.prototype = hmiMgr.fn;
// Expose $hmi as a global object
var $hmi = hmiMgr;
/**
 * hmiDataLink - creates a data link object
 */
function hmiDataLink() {
    this.tag = "";
    this.dataSrcId = "";
    this.dataSrc = null;
    this.rw = "r";
    this.tgtWgt = null;
    this.numXforms = 0;
    this.attr = "";
    this.sysCmd = "";
};
hmiDataLink.prototype.init = function (tagProps, wgt) {
    this.tgtWgt = wgt;
    if (tagProps != null) {
        if (tagProps.dataSrcId != undefined) this.dataSrcId = tagProps.dataSrcId;
        if (tagProps.tag != undefined) this.tag = tagProps.tag;
        if (tagProps.rw != undefined) this.rw = tagProps.rw;
        if (tagProps.attr != undefined) this.attr = tagProps.attr;
        if (tagProps.sysCmd != undefined) this.sysCmd = tagProps.sysCmd;
        if (tagProps.xforms != undefined) this.addXform(tagProps.xforms);
    }
};
hmiDataLink.prototype.getDataSrcValue = function () {
    var value;
    if (this.dataSrc == null) this.dataSrc = $hmiWgts[this.dataSrcId];
    if (this.dataSrc != null) {
        // do the xform
        value = this.dataSrc.getValue(this.tag);
        if (this.numXforms > 0) value = this.doXform(value, "r");
    }
    return value;
};
hmiDataLink.prototype.setWgtValue = function (newValue) {
    if (this.tgtWgt.isBadValue(newValue)) {
        return false;
    }
    // don't set if widget is write only
    if (this.rw != "w") {
        var oldValue = this.tgtWgt.getValue(this.attr);
        var value = newValue;
        if (this.numXforms > 0) {
            value = this.doXform(value, "r");
        }

        if (typeof this.tgtWgt.onDataUpdate != 'undefined') {
            this.doOnDataUpdate(value, oldValue);
        }
        // pass it on to the widget if the current value is not equal to the new value
        if (typeof oldValue === 'undefined' || oldValue === null) {
            this.tgtWgt.setValue(this.attr, value)
        } else {
            if (oldValue.toString() !== value.toString()) {
                this.tgtWgt.setValue(this.attr, value)
            }
        }
    }
};
/**
 * Function that initiates the OnDataUpdate event
 * @param {Number/String} newValue The new value of the widget
 * @param {Number/String} oldValue The existing value of the widget
 */
hmiDataLink.prototype.doOnDataUpdate = function (newValue, oldValue) {
    if ((this.tgtWgt != undefined) && (this.tgtWgt.onDataUpdate != undefined)) {
        //var curValue = this.tgtWgt!=null ? this.tgtWgt.getValue(this.attr) : 0;
        // pass in standard parameters to the JS function
        var eventInfo = {
            attribute: this.attr,
            oldValue: oldValue,
            newValue: newValue,
            index: 0
        };
        var actionFuncs = this.tgtWgt.onDataUpdate.split(';');
        for (var i = 0; i < actionFuncs.length; i++) {
            $hmi.doAction(this.tgtWgt.wgtId, actionFuncs[i], eventInfo); //Global access
        }
    }
};
hmiDataLink.prototype.setTagValue = function (newValue) {
    if (this.dataSrc == null) this.dataSrc = $hmi(this.dataSrcId).widget();
    if (this.dataSrc != null) {
        // do the xform
        var value = newValue;
        if (this.numXforms > 0) value = this.doXform(value, "w");
        // pass it on to the widget
        this.dataSrc.setValue(this.tag, value);
    }
};
hmiDataLink.prototype.addXform = function (xform) {
    if (this.numXforms == 0) this.xform = new Array();
    this.xform[this.numXforms] = xform;
    this.numXforms++;
};
hmiDataLink.prototype.doXform = function (value, readWrite) {
    var retValue = value;
    var strXform;
    for (i = 0; i < this.numXforms; i++) {
        strXform = this.xform[i];
        var idx1 = strXform.indexOf("(");
        var idx2 = strXform.indexOf(")");
        var params = [];
        if (idx1 > 0) {
            var xformName = strXform.substring(0, idx1);
            var strParams = strXform.substring(idx1 + 1, idx2);
            params = strParams.split(",");
            if (xformName != null) {
                var objXform = $hmi.getXform(xformName);
                if (objXform != undefined) {
                    retValue = objXform.execute(this, retValue, readWrite, params);
                }
            }
        }
    }
    return retValue;
};;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiShadowFx() { 
}
hmiShadowFx.prototype.effect = function (options, element) {
		// add a bottom div to show the shadow
	if (options.shape==='round')
		$(element).addClass("hmi-fx-shadow-round");
	else
		$(element).addClass("hmi-fx-shadow");

}
$hmi.addFx('shadow', new hmiShadowFx());

// float effect
function hmiFloatFx() { 
}
hmiFloatFx.prototype.effect = function (options, element) {

	$(element).wrap("<div class='hmi-fx-float' ></div>");
}
$hmi.addFx('float', new hmiFloatFx());;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiWidget(wgtId, options, parentPage) {
    // do nothing for an empty constructor
    if (!wgtId)
        return;
    this.wgtId = wgtId;
    this.opacity = null;
    this.visibility = null;
    this.x = null;
    this.y = null;
    this.parentPage = parentPage;
    this.elem = document.getElementById(wgtId);
		// not sure why this is in the base class (most widgets do not have text)
	this.masked = false;
    this.maskChar = '*';

    if (options)
        this.setOptions(options);

    if (!this.parentPage)
        this.parentPage = $hmi.activePage;

    if (this.parentPage!==null)
        this.parentPage.addWidget(this.wgtId, this);
     
};

/**
 * Sets the widget id
 * @param {String} strId A string representing the Id of the widget
 */
hmiWidget.prototype.setId = function (strId) {
    this.wgtId = strId;
};
/**
 * Sets the element
 * @param {Object} elem An HTML element
 */
hmiWidget.prototype.setElem = function (elem) {
    this.elem = elem;
};
/**
 * Initialization. It sets the props as variables of the object.
 * @param {Object} props The properties of the widget.
 */
hmiWidget.prototype.setOptions = function (options) {
    if (options != null) {
        for (var i in options) {
            this[i] = options[i];
        }
    }
};
/**
 * Empty function that can be override by the child widgets
 */
hmiWidget.prototype.init = function () {
};
/**
 * method sets the widget's property value that depends on another widget's property value
 * @param {String} tag The attribute name
 * @param {string/Number} newValue The value of the property
 */
hmiWidget.prototype.setValue = function (tag, newValue) {
    newValue = parseFloat(newValue);
    if (tag === 'visibility' && typeof this.elem === 'object') {
        if (newValue === 0 && this.elem.style.display !== 'none') {
            this.elem.style.display = 'none';
            this.visibility = 0;
        } else if (newValue !== 0 && this.elem.style.display === 'none') {
            this.elem.style.display = 'block';
            this.visibility = 1;
        }
    } else if ((tag === 'opacity' || tag === 'fill-opacity') && typeof this.elem === 'object') {
        if (this.opacity != newValue) {
            this.opacity = newValue;
            $(this.elem).fadeTo(0, newValue);
        }
    } else if (tag === 'x' && typeof this.elem === 'object') {
        if (this.x != newValue) {
            this.x = newValue;
            this.elem.style.left = newValue + 'px';
        }
    } else if (tag === 'y' && typeof this.elem === 'object') {
        if (this.y != newValue) {
            this.y = newValue;
            this.elem.style.top = newValue + 'px';
        }
    } else if (tag === 'max') { //Widget's max property, if it has one
        this.setWgtProperty(tag, newValue);
    } else if (tag === 'min') { //Widget's min property, if it has one
        this.setWgtProperty(tag, newValue);
    } else if (tag === 'animate') {
        if (this.setWgtProperty(tag, newValue)) {
            if (typeof this.stopAnimation === 'function' && typeof this.startAnimation === 'function') {
                this[newValue === 0 ? 'stopAnimation': 'startAnimation']();
            }
        }
    } else if (tag === 'updateRate') {
        if (newValue > 0 && this.setWgtProperty(tag, newValue) && this.animate) {
            if (typeof this.stopAnimation === 'function' && typeof this.startAnimation === 'function') {
                this.stopAnimation();
                this.startAnimation();
            }
        }
    }
};

/**
 * This function will mask the original visual widget value with the mask characters
 * @param {Number/String} val The widget value
 */
hmiWidget.prototype.setMaskedValue = function (val) {
    var len = val.toString().length, msk = '';
    for (var i = 0; i < len; i++) {
        msk += this.maskChar;
    }
    if (this.elem) {
        this.elem.innerHTML = msk;
    }
};

/**
 * This function sets widget's property  to the provided value, if the property exist in the widget
 * @param {String} tag The attribute/property name of the widget
 * @param {string/Number} newValue Teh value of the widget property
 */
hmiWidget.prototype.setWgtProperty = function (tag, newValue) {
    if (typeof this[tag] !== 'undefined' && this[tag] != newValue) {
        this[tag] = newValue;
        return 1;
    }
    return 0;
};
/**
 * Empty function that can be override by the child widgets
 */
hmiWidget.prototype.getValue = function (tag) {
    var keys = {x: 'left', y: 'top', height: 'height', width: 'width'}
    if (tag === 'visibility') {
        return this.elem.style.display === null || this.elem.style.display == 'none' ? 0: 1;
    } else {
        if (typeof keys[tag] !== 'undefined') {
            return this.elem ? this.elem.style[keys[tag]].split('px')[0]: null;
        }
    }
    return null;
};
/**
 * Empty function that can be override by the child widgets. This can be used for starting the widget
 */
hmiWidget.prototype.start = function () {
};
/**
 * Empty function that can be override by the child widgets. This can be used for stopping the widget
 */
hmiWidget.prototype.stop = function () {
};
/**
 * Empty function that can be override by the child widgets. This can be used for activating the widget
 */
hmiWidget.prototype.activate = function () {
    // handle actions attached to the widget
    var actionFlag = 0;
    if (this.onActivate) {
        actionFuncs = this.onActivate.split(';');
        for (var i = 0; i < actionFuncs.length; i++) {
            $hmi.doAction(this.wgtId, actionFuncs[i]);
        }
    }
};
/**
 * Empty function that can be override by the child widgets. This can be used for deactivating the widget
 */
hmiWidget.prototype.deactivate = function () {
    // handle actions attached to the widget
    var actionFlag = 0;
    if (this.onDeactivate) {
        actionFuncs = this.onDeactivate.split(';');
        for (var i = 0; i < actionFuncs.length; i++) {
            $hmi.doAction(this.wgtId, actionFuncs[i]);
        }
    }
};
hmiWidget.prototype.bind = function (wgtEvent, wgt) {
};
hmiWidget.prototype.trigger = function (wgtEvent) {
};
/**
 * Adds the DatLink widgets
 * @param {object} newlink A DataLink widget instance
 */
hmiWidget.prototype.addDataLink = function (newLink) {
    if (this.dataLinks == undefined) {
        this.dataLinks = [];
    }
    this.dataLinks.push(newLink);
};
/**
 * Tells any widgets attached to this widget that the data has changed
 * @param {String} tag The tag name
 * @param {String/Number} value The tah value
 */
hmiWidget.prototype.sendUpdate = function (tag, value) {
    // update the attached variables
    if (this.dataLinks) {
        for (var i = 0; i < this.dataLinks.length; i++) {
            if (this.dataLinks[i].tag == tag) {
                this.dataLinks[i].setWgtValue(value);
            }
        }
    }
};
/**
 * Tells writes the value from widget to datasource
 * @param {String} attr The attribute name
 * @param {String/Number} value The value of attribute.
 */
hmiWidget.prototype.doWriteValue = function (attr, newValue) {
    // update the attached variables
    if (this.dataLinks) {
        for (var i = 0; i < this.dataLinks.length; i++) {
            var dataLink = this.dataLinks[i];
            if ((dataLink.attr == attr) && (dataLink.dataSrc != this)) {
                dataLink.setTagValue(newValue);
            }
        }
    }
    	// initiate jquery change events so we are compatible with jquery widgets
    $(this.elem).trigger('change.'+attr, {tag:attr, value:newValue});
};
/**
 * Function that determines whether the incoming value is invalid or not
 * @param {String/Number} newValue The new value the widget is going to have
 * @return {Boolean} true if it is a invalid value otherwise false
 */
hmiWidget.prototype.isBadValue = function (newValue) {
    if ($(this.elem).css('display') === 'none') {
        return false;
    }

    if (newValue === null || isNaN(newValue)) {
        if (!$(this.elem).hasClass('bad-a')) {
            $(this.elem).addClass('bad-a'); //a dummy class assignment just to identify the element on which we've enabled the bad value icons.
            this.showBadValueIcon();
        }
        return true;
    } else {
        if ($(this.elem).hasClass('bad-a')) {
            this.removeBadValueIcon();
            $(this.elem).removeClass('bad-a');
        }
        return false;
    }
};
/**
 * Function that shows the bad value icon on the associated widgets
 */
hmiWidget.prototype.showBadValueIcon = function () {
    var badId = this.wgtId + '_bad', badClass = 'bad', badElemWidth = 16, sHtml = '<div id="' + badId + '" class="' + badClass + '"></div>';
    //New element creation
    var $badElem = $(sHtml);
    //Appending it to Body
    $('body').append($badElem);
    //Computation of bad element position
    var offset = $(this.elem).offset(), posX = (offset.left + $(this.elem).width()) - badElemWidth, posY = offset.top;
    $badElem = document.getElementById(badId);
    if ($badElem) {
        $badElem.style.left = posX + 'px';
        $badElem.style.top = posY + 'px';
        $badElem.style.width = badElemWidth + 'px';
        $badElem.style.height = badElemWidth + 'px';
    }
};
/**
 * Function that removes the bad value icon from the associated widget
 */
hmiWidget.prototype.removeBadValueIcon = function () {
    $('#' + this.wgtId + '_bad').remove();
};
// add widget to the lst based on the namespace
hmiWidget.prototype.addWidget = function (id, wgtObj) {
    if (!this.wgts) {
        this.wgts = [];
    }
    this.wgts[id] = wgtObj;
    this.initPagePrefixes(id);
};
hmiWidget.prototype.initPagePrefixes = function (id) {
    if (id.indexOf('_') !== -1) {
        var prefix = id.substring(0, id.indexOf('_'));
        $hmi.setActivePagePrefixes(prefix);
    }
}
// remove a widget from the list
hmiWidget.prototype.removeWidget = function (id) {
    if (this.wgts) {
        this.wgts[id] = null;
    }
};
hmiWidget.prototype.getWidget = function (id) {
    return (this.wgts) ? this.wgts[id]: null;
};;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiPage(wgtId, options, parentPage) {
    if (!wgtId)
        return;

    this.dialog = 0;
    this.pageActivateHdlrs = [];
    this.pageDeactivateHdlrs = [];
    this.pageStartHdlrs = [];
    this.pageStopHdlrs = [];
    this.pgHdlrActive = 0;
		// make sure the hmi mgr is inited
	$hmi.init();

    hmiWidget.call(this, wgtId, options, parentPage);
    // add the page to the global widgets and make us the active page
    $hmi.addWidget(wgtId, this);
    $hmi.setActivePage(this);
}
/**
 * Inheriting the base class Widget
 */
hmiPage.prototype = new hmiWidget();
/**
 * Function that binds the page events
 * @param {String} wgtEvent The event name
 * @param {Object} wgt
 */
hmiPage.prototype.bind = function (wgtEvent, wgt) {
    if (wgtEvent == "pageactivate") {
        //this.pageActivateHdlrs[this.pageActivateHdlrs.length] = wgt;
        this.pageActivateHdlrs.push(wgt);
    } else if (wgtEvent == "pagedeactivate") {
        //this.pageDeactivateHdlrs[this.pageDeactivateHdlrs.length] = wgt;
        this.pageDeactivateHdlrs.push(wgt);
    } else if (wgtEvent == "pagestart") {
        //this.pageStartHdlrs[this.pageStartHdlrs.length] = wgt;
        this.pageStartHdlrs.push(wgt);
    } else if (wgtEvent == "pagestop") {
        //this.pageStopHdlrs[this.pageStopHdlrs.length] = wgt;
        this.pageStopHdlrs.push(wgt);
    }
};
/**
 * Function that trigger a particular event associated with the page
 * @param {String} wgtEvent Event name
 */
hmiPage.prototype.trigger = function (wgtEvent) {
    wgtEvent = wgtEvent.toLowerCase();
    if (wgtEvent === "pageactivate") {
        $hmi.setActivePage(this);
        // execute page activate
        this.activate();
        // execute child activate handlers
        for (i = 0; i < this.pageActivateHdlrs.length; i++)
            this.pageActivateHdlrs[i].activate();
    } else if (wgtEvent === "pagedeactivate") {
        this.deactivate();
        for (i = 0; i < this.pageDeactivateHdlrs.length; i++)
            this.pageDeactivateHdlrs[i].deactivate();
    } else if (wgtEvent === "pagestart") {
        this.start();
        for (i = 0; i < this.pageStartHdlrs.length; i++) {
            this.pageStartHdlrs[i].start();
        }
        this.pgHdlrActive = 1;
    } else if (wgtEvent === "pagestop") {
        this.stop();
        for (i = 0; i < this.pageStopHdlrs.length; i++) {
            this.pageStopHdlrs[i].stop();
        }
        this.pgHdlrActive = 0;
    }
};
/**
 * Function that sets the dialog page's element
 */
hmiPage.prototype.setDialogElem = function () {
    this.elem = document.getElementById(this.wgtId + 'Dialog');
    this.dialog = this.elem ? 1 : 0;
};
$hmi.fn.hmiPage = function (options, parentPage) {
    return new hmiPage(this.wgtId, options, parentPage);
};;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiButton(wgtId, options, parentPage) {
    // do nothing for default constructor
    if (!wgtId) return;
    // default property values
    this.imgX = 0;
    this.imgY = 0;
    this.imgYbase = 0;
    this.imgWidth = null;
    this.imgHeight = null;
    this.curState = 0;
    this.isToggle = false;
    this.action = "write";
    // local vars
    this.numStates = 2;
    this.rawValue = 0;
    this.clickDelay = 0;
    this.clickDx = 2;
    this.clickDy = 2;
    this.isOffset = 0;
    this.type = "standard";
    this.strokeWidth = 1;
    hmiWidget.call(this, wgtId, options, parentPage);
    //  need to have good values for imgWidth and imgHeight for button to work
    if (!this.imgWidth && this.elem)
        this.imgWidth = this.elem.clientWidth;
    if (!this.imgHeight && this.elem)
        this.imgHeight = this.elem.clientHeight;
    	
    this.imgYbase = this.imgY;    	

     if (this.fill != undefined) {
        this.setValue('fill', this.fill);
    }         	   
    
    var self = this;
		//Event handler assignments	
	if (this.parentPage) {
		// if parent page, handle mouse clicks globally
		$(self.elem).bind( "mousedown.button", function (evt) {
			$hmi.handleMouse(self);
		});
		$(self.elem).bind("touchstart", function (evt) {
			evt.preventDefault();
			$hmi.handleMouse(self);
		});
	} else {
		// if no parent page, need to handle the mouse clicks in the widget
		$(self.elem).bind( "mousedown.button", function( event ) {
			if ( options.disabled ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			} else if (self) {
				var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
				self.doMouseDown(evtInfo);
			}
		});
		$(self.elem).bind( "mouseup.button", function( event ) {
			if ( options.disabled ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			} else if (self) {
				var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
				self.doMouseUp(evtInfo);
			}
		});
	}

}

/**
 * Inheriting the base class Widget
 */
hmiButton.prototype = new hmiWidget();

/**
 * function that handles the onmousedown event for a Button widget. 
 * @param {Object} evtInfo The event object, custom one
 */
hmiButton.prototype.doMouseDown = function (evtInfo) {
    var newState = (!this.isToggle ? 1 : (this.curState === 1 ? 0 : 1));
    this.setValue('value', newState);
    // need to update tag attached to button
    this.doWriteValue('value', this.curState);

};

/**
 * function that handles the onmouseup event for a Button widget.
 * @param {Object} evtInfo The event object, custom one
 */
hmiButton.prototype.doMouseUp = function (evtInfo) {
    if (!this.isToggle) {
        this.setValue('value', 0);     
	    // need to update tag attached to button
	    this.doWriteValue('value', this.curState);
    }
};

/**
 * Changes the state of button.
 */
hmiButton.prototype.updateValue = function () {
    this.setState(this.curState === 1 ? 0: 1);
};

/**
 * Setting the value of the Button widget
 * @param {String} tag The tag name
 * @param {Number} newValue The widget value
 */
hmiButton.prototype.setValue = function (tag, newValue) {

    if (tag == 'value') {
	    if (this.isBadValue(newValue)) {
	        return false;
	    }
		newValue = parseFloat(newValue);
        if (isNaN(newValue)) {
            return false;
        }
       // click delay is so we don't update after we clicked on the button
        // need to give time for the write value to get to the panel
        if (this.clickDelay <= 0) {
        	var oldState = this.curState;
            this.setState(newValue);
		    	// store value in the element for compat with jquery interface
		    this.elem.value = newValue;
            // update any widgets attached to us only if there is change in the curState values
            if (oldState !== this.curState) {
                this.sendUpdate(tag, this.curState);
            }
       } else {
            this.clickDelay--;
        }
    } else if (tag == 'fill') {
		var indexValue = parseInt(newValue)
		if (indexValue) {
			// palette colors are below the base color
			this.imgY = this.imgYbase + (indexValue + 1) * this.imgHeight;
			// refresh the widget
			this.redraw();
		} else {
			this.elem.style.backgroundColor	= newValue;
			// refresh the widget
			this.redraw();
		}
	} else {
        hmiWidget.prototype.setValue.call(this, tag, newValue);
    }
};

/**
 * Function to get the value of the Widget
 * @param {String} tag tag name will be the property name
 */
hmiButton.prototype.getValue = function (tag) {
    if (tag == "value") {
        return this.curState;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};

/**
 * Set the state of button.
 * @param {Number} newState New state value
 */
hmiButton.prototype.setState = function (newState) {
    //The button has only two states either 0 or 1. The button will be shown in pressed state only if its value is 1 in all other case it maintains 0 state
    //if you use this.curState for this purpose the button will show pressed and release state for every value that we dont want
    var value = newState > 1 || newState < 0 ? 0: newState;
    //if we don't use Math.abs then it will return negated reminders if the value is < 0
    newState = Math.abs(newState % this.numStates);
    if (this.curState != newState) {
        this.curState = newState;
        if (this.type === "standard") {
            // shift the image in the image list (use neg values for images)
            var imgOffset = -this.imgX - (value * this.imgWidth);
            $(this.elem).css('background-position', imgOffset + 'px ' + -this.imgY + 'px');
        } else if ((this.type === "rectangle") || (this.type === "oval")) {
            if (this.curState) {
                if (this.dwnFill) this.elem.style.backgroundColor = this.dwnFill;
                if (this.dwnStroke) this.elem.style.borderColor = this.dwnStroke;
            } else {
                if (this.upFill) this.elem.style.backgroundColor = this.upFill;
                if (this.upStroke) this.elem.style.borderColor = this.upStroke;
            }
        } else if ((this.type === "css-box")&&this.downClass) {
        	if (this.curState) {
				$(this.elem).addClass(this.downClass);
			} else {
				$(this.elem).removeClass(this.downClass);				
			}
        }
        // offset the widgets inside of the group
        // only works if element is visible (use offsetWidth to determine if element is visible)
        if (this.elem.offsetWidth != 0) {
            if ((this.curState == 0) && this.isOffset) {
                this.offsetWgts(-this.clickDx, -this.clickDy);
                this.isOffset = 0;
            } else if ((this.curState == 1) && (this.isOffset == 0)) {
                this.offsetWgts(this.clickDx, this.clickDy);
                this.isOffset = 1;
            }
        }
    }
};

/**
 * Function readraws the button image based on the current state
 */
hmiButton.prototype.redraw = function () {
    // shift the image in the image list (use neg values for images)
	if (this.type==="standard") {
	    var imgOffset = -this.imgX - (this.curState * this.imgWidth);
	    $(this.elem).css('background-position', imgOffset + 'px ' + -this.imgY + 'px');
	}
};

/**
 * Handles Button widget offsetX and offsetY animation while clicking on it
 * @param {Number} dx The x value that needs to be applied on the animation
 * @param {Number} dy The y value that needs to be applied on the animation
 */
hmiButton.prototype.offsetWgts = function (dx, dy) {
    var intersectsElem = function (elem1, elem2) {
        return !((elem2.offsetLeft > (elem1.offsetLeft + elem1.offsetWidth)) || ((elem2.offsetLeft + elem2.offsetWidth) < elem1.offsetLeft) || (elem2.offsetTop > (elem1.offsetTop + elem1.offsetHeight)) || ((elem2.offsetTop + elem2.offsetHeight) < elem1.offsetTop));
    }
    var pel = this.elem.parentNode;
    if (pel.className.indexOf('GroupWgt') !== -1) {
        var bEnableOffset = false;
        var divs = pel.getElementsByTagName('div');
        for (var i = 0, l = divs.length; i < l; i++) {
            var elem = divs[i];
            // use offsetWidth to determine if the element is visible (offsetWidth is 0 when element is not shown)
            if (bEnableOffset && (elem.offsetWidth != 0) && intersectsElem(elem, this.elem)) {
                elem.style.left = (elem.offsetLeft + dx) + "px";
                elem.style.top = (elem.offsetTop + dy) + "px";
            }
            // wait till we pass the button in the list.  We only want to shift widgets after (higher z-order) the button
            if (elem == this.elem) bEnableOffset = true;
        }
    } else {
    	// if we are not in a group, then offest this element
        	// use offsetWidth to determine if the element is visible (offsetWidth is 0 when element is not shown)
        if (this.elem.offsetWidth != 0) {
        	var elem = this.elem;
        	if (dx>0) {
        		this.savePadLeft = $(elem).css("padding-left");
       			this.savePadTop = $(elem).css("padding-top");	
	            elem.style.paddingLeft = (parseInt(this.savePadLeft) + dx) + "px";
	            elem.style.paddingTop = (parseInt(this.savePadTop) + dy) + "px";
	        } else {
	            elem.style.paddingLeft = this.savePadLeft;
	            elem.style.paddingTop = this.savePadTop;	        	
	        }
        }
    }
};

$hmi.fn.hmiButton = function (options, parentPage) {
    return new hmiButton(this.wgtId, options, parentPage);
};;
/*
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiBorder(wgtId, options, parentPage) {
	hmiWidget.call(this, wgtId, options, parentPage);	
	
};
hmiBorder.prototype = new hmiWidget();


$hmi.fn.hmiBorder = function(options, parentPage) {
	return new hmiBorder(this.wgtId, options, parentPage);
};


;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiNumeric(wgtId, options, parentPage) {
    // do nothing for default constructor
    if (!wgtId) return;

    this.rw = 'r';
    this.numFormat = "#";
    this.value = null;
    this.min = null;
    this.max = null;
    hmiWidget.call(this, wgtId, options, parentPage);
    
    //Attaching the provision for inserting the value of widget over browser
    this.attachKeypadEvents();
}
/**
 * Inheriting the base class Widget
 */
hmiNumeric.prototype = new hmiWidget();
/**
 * Initializing the widget with the provided properties
 * @param {Object} props The properties of the widget
 */
hmiNumeric.prototype.setOptions = function (props) {
    if (props != null) {
        for (var item in props) {
            this[item] = props[item];
        }
        //Even if there is no tag associated with the widget make sure that the current innerHTML value of the widget
        //Div element formatted properly based on the numFormat property
        var val = $(this.elem).html();
        if ($.trim(val) !== '') {
            if (this.value === null) {
                this.value = parseFloat(val); //Storing the initial value, which can come handy if the widget is not attached to any tag
            }
            if (!this.masked) {
                var newVal = this.format(val);
                if (!isNaN(newVal)) {
                    this.elem.innerHTML = newVal;
                }
            } else {
                this.setMaskedValue(this.format(val));
            }
        }
    }

};
/**
 * Function that handles the event attachments on Numeric widgets for making the dynamic data insertion possible
 */
hmiNumeric.prototype.attachKeypadEvents = function () {
    if (this.rw === 'w' || this.rw === 'rw') {
        var me = this;
        $(this.elem).click(function () {
            me.showKeyPad();
        });
    }
};

hmiNumeric.prototype.resizeHdlrForKpd = function () {
    var offset = $('#' + $('#kpd').data('wgtId')).offset();
    document.getElementById('kpd').style.left = offset.left + 'px';
    document.getElementById('kpd').style.top = offset.top + 'px';
};
/**
 * Function that shows the dialog box for inserting data
 */
hmiNumeric.prototype.showKeyPad = function () {
    var me = this;
    if (document.getElementById('kpd')) {
        //Seems that the keypad dialog is visible
        return false;
    }
    //New element insertion into DOM
    var sHtml = '<div id="kpd"><input name="nField" id="nField" value="" autocapitalize="off"><br><button type="button" class="positive" name="save" id="save"><div class="img saveimg"></div></button><button type="button" class="negative" name="discard" id="discard"><div class="img cancelimg"></div></button></div>';
    var $newdiv1 = $(sHtml);
    $('body').append($newdiv1);
    //Position the container
    var keypad = document.getElementById('kpd');
    $('#kpd').data('wgtId', this.elem.id);
    var offset = $(this.elem).offset();
    keypad.style.left = offset.left + 'px';
    keypad.style.top = offset.top + 'px';
    //Style the text box based on the Numeric widget on which it is going to work
    var nFields = keypad.getElementsByTagName('input');
    if (nFields.length > 0) {
        var nField = nFields[0];
        //use jquery so we get the computed style
        if (nField) {
            var el = $(this.elem);
            nField.style.width = el.css('width');
            nField.style.height = el.css('height');
            nField.style.color = '#383838';
            nField.style.backgroundColor = '#dfdfde';
            nField.style.font = el.css('font');
            nField.style.fontSize = el.css('font-size');
            nField.style.textAlign = el.css('textAlign');
            nField.value = this.value;
            //Focus on the textbox
            nField.focus();
            nField.setSelectionRange(0, 9999);
        }
    }
    //ok button click event attachments
    $('#kpd #save').click(function () {
        var newVal = $('#nField').val(); //Get the value from the field   
        newVal = $.trim(newVal);
        var decimalRegex = /^\-?[0-9]*\.?[0-9]+$/ //Decimal regular expression for checking the value
        if (decimalRegex.test(newVal)) {
			me.setValue("value", newVal);
		    // need to update tags attached to widget
		    me.doWriteValue('value', me.value);			
        }
        me.hideKeyPad(); //Destroy the dialog
    });
    //cancel button click event attachments
    $('#kpd #discard').click(function () {
        me.hideKeyPad();
        $(window).unbind('resize', me.resizeHdlrForKpd);
    });
    //keyup event handler for the text box
    $('#kpd #nField').keyup(function (e) {
        if (e.keyCode === 13) {
            $('#save').click();
        } else if (e.keyCode === 27) {	// escape key
        	$('#discard').click();       	
        }
    });

    $(window).unbind('resize', this.resizeHdlrForKpd);
    $(window).bind('resize', this.resizeHdlrForKpd);
};
/**
 * Function that destroys the keypad dialog
 */
hmiNumeric.prototype.hideKeyPad = function () {
    $(window).unbind('resize', this.resizeHdlrForKpd);
    $('#kpd').remove();
};
/**
 * Setting the masked value of the Numeric widget
 * @param {String} val The mask widget value
 */
hmiNumeric.prototype.setMaskedValue = function (val) {
    var len = this.format(val).toString().length,
        msk = '';
    for (var i = 0; i < len; i++) {
        msk += this.maskChar;
    }
    if (this.elem) {
        this.elem.innerHTML = msk;
    }
};
/**
 * Setting the value of the Numeric widget
 * @param {String} tag The tag name
 * @param {Number} newValue The widget value
 */
hmiNumeric.prototype.setValue = function (tag, newValue) {
    if (this.isBadValue(newValue)) {
        return false;
    }
    if (this.elem != null) {
        if (tag == "value") {
            newValue = parseFloat(newValue);
            if (isNaN(newValue)) {
                return false
            }
            //min and max properties comes into play only  if studio has generated the min and max property - Commented on 23-02-2012
            /*if (this.min !== null && this.max !== null) {
             newValue = (newValue <= this.min ? this.min : (newValue >= this.max ? this.max : newValue));
             }*/
            if (this.value != newValue) {
                if (this.numFormat.indexOf('.') === -1) {
                    newValue = parseInt(newValue);
                }
                this.value = newValue;
                if (!this.masked) {
                    this.elem.innerHTML = this.format(newValue);
                } else {
                    this.setMaskedValue(this.format(newValue));
                }
            }
            // update any other widgets that are attached to us
            this.sendUpdate(tag, this.value);
        } else {
            hmiWidget.prototype.setValue.call(this, tag, newValue);
        }
    }
};
/**
 * Function to get the value of the Widget
 * @param {String} tag tag name will be the property name
 */
hmiNumeric.prototype.getValue = function (tag) {
    if (tag == "value") {
        return this.value;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};
/**
 * Applies the numeric format of the Numeric widget
 * @param {String} newValue A string representing the format of a numeric
 * @return {String} formatted number
 */
hmiNumeric.prototype.format = function (newValue) {
    var strValue;
    if (this.numFormat == "#") {
        strValue = parseInt(newValue);
    } else {
        var dotPos = this.numFormat.lastIndexOf('.');
        if (dotPos >= 0) {
            var fValue = parseFloat(newValue);
            var decimalPlaces = this.numFormat.substring(dotPos + 1, this.numFormat.length).length;
            strValue = fValue.toFixed(decimalPlaces);
        } else {
            var hPos = this.numFormat.indexOf('h');
            if (hPos > 0) {
                var hNum = parseInt(newValue);
                var fl = hNum < 0 ? true: false;
                hNum = hNum < 0 ? (0xFFFFFFFFFFFFF + hNum + 1): hNum;
                strValue = hNum.toString(16).toLowerCase();
                if (fl && strValue.length < 16) {
                    var pad1 = 16 - strValue.length;
                    for (var i = 0; i < pad1; i++) {
                        strValue = "f" + strValue;
                    }
                }
            } else {
                hPos = this.numFormat.indexOf('H');
                if (hPos > 0) {
                    var hNum = parseInt(newValue);
                    var fl = hNum < 0 ? true: false;
                    hNum = hNum < 0 ? (0xFFFFFFFFFFFFF + hNum + 1): hNum;
                    strValue = hNum.toString(16).toUpperCase();
                    if (fl && strValue.length < 16) {
                        var pad1 = 16 - strValue.length;
                        for (var i = 0; i < pad1; i++) {
                            strValue = "F" + strValue;
                        }
                    }
                } else {
                    strValue = parseInt(newValue).toString();
                }
            }
            if ((this.numFormat.indexOf('0') === 0) && (this.numFormat.lastIndexOf('#') >= 0)) {
                // prepend 0				
                var pad = this.numFormat.split('#').length - strValue.length;
                for (var i = 0; i < pad; i++) {
                    strValue = "0" + strValue;
                }
            }
        }
    }
    return strValue;
};
$hmi.fn.hmiNumeric = function (options, parentPage) {
    return new hmiNumeric(this.wgtId, options, parentPage);
};;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiDateTime(wgtId, options, parentPage) {
    // do nothing for default constructor
    if (!wgtId) return;

    this.format = 'HH:mm:ss AP';
    this.rw = null;
    this.timeSpec = 'local';
    this.interval = 1000;
    this.timer = null;
    this.needsInterval = false;
    this.value = null;
    this.dataLinks = [];
    this.serverTime = null;
    hmiWidget.call(this, wgtId, options, parentPage);
    
	if (this.timeSpec !== 'server') {
        this.updateValue();
    }   
    var me = this;
    	// start tick thread for local time updates
    if (this.timeSpec==='local') {
	    this.timer = setInterval(function () {
	        me.updateValue();
	    }, me.interval);    
	}
}
/**
 * Inheriting the base class Widget
 */
hmiDateTime.prototype = new hmiWidget();


/**
 * function formats the date/time value
 * @param {String} format date/time format string
 * @param {Object} serverDate JS Date object that comes for the Server date
 * @return {String} formatted date/time string
 */
hmiDateTime.prototype.formatValue = function (strFormat, dt) {

    var strValue=strFormat;
    	// support time/date in any format
    var params = this.computeTimeParams(dt, this.timeSpec);
    strValue = strValue.replace('MM', params.cmonth);
    strValue = strValue.replace('DD', params.cdate);
    strValue = strValue.replace('YYYY', params.cyear4);
    strValue = strValue.replace('YY', params.cyear2);
    strValue = strValue.replace('mmm', params.months[params.dt.getMonth()]);
    strValue = strValue.replace('HH', params.hrs12);
    strValue = strValue.replace('hh', params.hrs);
    strValue = strValue.replace('mm', params.mts);
    strValue = strValue.replace('ss', params.sec);
    strValue = strValue.replace('AP', params.amPm);           

	return strValue;
};
// return the format based on the date or time string
hmiDateTime.prototype.computeTimeParams = function(dt, timeSpec) {
	var params = {};
	
    params.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	if ($.type(dt).toLowerCase() !== 'date')
		return;
		
	params.dt = dt;        
    if (timeSpec === 'local') {

    	params.cdate = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
        params.cmonth = (dt.getMonth() + 1) < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
        params.cyear2 = dt.getFullYear().toString().slice(2);
        params.cyear4 = dt.getFullYear();
        params.hrs = dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours();
        params.mts = dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes();
        params.sec = dt.getSeconds() < 10 ? '0' + dt.getSeconds() : dt.getSeconds();
        params.amPm = parseInt(params.hrs) < 12 ? 'AM' : 'PM';
        params.hrs12 = parseInt(params.hrs) < 13 ? params.hrs : (parseInt(params.hrs) - 12) < 10 ? '0' + (parseInt(params.hrs) - 12) : (parseInt(params.hrs) - 12);
    } else if (timeSpec === 'global') {
       	params.cdate = dt.getUTCDate() < 10 ? '0' + dt.getUTCDate() : dt.getUTCDate();
        params.cmonth = (dt.getUTCMonth() + 1) < 10 ? '0' + (dt.getUTCMonth() + 1) : dt.getUTCMonth() + 1;
        params.cyear2 = dt.getUTCFullYear().toString().slice(2);
        params.cyear4 = dt.getUTCFullYear();
        params.hrs = dt.getUTCHours() < 10 ? '0' + dt.getUTCHours() : dt.getUTCHours();
        params.mts = dt.getUTCMinutes() < 10 ? '0' + dt.getUTCMinutes() : dt.getUTCMinutes();
        params.sec = dt.getUTCSeconds() < 10 ? '0' + dt.getUTCSeconds() : dt.getUTCSeconds();
        params.amPm = parseInt(params.hrs) < 12 ? 'AM' : 'PM';
        params.hrs12 = parseInt(params.hrs) < 13 ? params.hrs : (parseInt(params.hrs) - 12) < 10 ? '0' + (parseInt(params.hrs) - 12) : (parseInt(params.hrs) - 12);
    } else  {
        params.cdate = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
        params.cmonth = (dt.getMonth() + 1) < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
        params.cyear2 = dt.getFullYear().toString().slice(2);
        params.cyear4 = dt.getFullYear();
        params.hrs = dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours();
        params.mts = dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes();
        params.sec = dt.getSeconds() < 10 ? '0' + dt.getSeconds() : dt.getSeconds();
        params.amPm = parseInt(params.hrs) < 12 ? 'AM' : 'PM';
        params.hrs12 = parseInt(params.hrs) < 13 ? params.hrs : (parseInt(params.hrs) - 12) < 10 ? '0' + (parseInt(params.hrs) - 12) : (parseInt(params.hrs) - 12);
    }
    return params;
}

// return the format based on the date or time string
hmiDateTime.prototype.computeFormatString = function(strFormat, params) {
	var value = strFormat;
 
    switch (strFormat) {
    case 'MM/DD/YY':
        value = params.cmonth + '/' + params.cdate + '/' + params.cyear2;
        break;
    case 'MM/DD/YYYY':
        value = params.cmonth + '/' + params.cdate + '/' + params.cyear4;
        break;
    case 'DD/MM/YY':
        value = params.cdate + '/' + params.cmonth + '/' + params.cyear2;
        break;
    case 'DD/MM/YYYY':
        value = params.cdate + '/' + params.cmonth + '/' + params.cyear4;
        break;
    case 'MM.DD.YY':
        value = params.cmonth + '.' + params.cdate + '.' + params.cyear2;
        break;
    case 'MM.DD.YYYY':
        value = params.cmonth + '.' + params.cdate + '.' + params.cyear4;
        break;
    case 'DD.MM.YY':
        value = params.cdate + '.' + params.cmonth + '.' + params.cyear2;
        break;
    case 'DD.MM.YYYY':
        value = params.cdate + '.' + params.cmonth + '.' + params.cyear4;
        break;
    case 'mmm DD YYYY':
        value = params.months[dt.getMonth()] + ' ' + params.cdate + ' ' + params.cyear4;
        break;
    case 'DD mmm YYYY':
        value = params.cdate + ' ' + params.months[dt.getMonth()] + ' ' + params.cyear4;
        break;
    case 'hh:mm:ss':
        value = params.hrs + ":" + params.mts + ":" + params.sec;
        break;
    case 'HH:mm:ss AP':
        value = params.hrs12 + ':' + params.mts + ':' + params.sec + ' ' + params.amPm;
        break;
    case 'hh:mm':
        value = params.hrs + ":" + params.mts;
        break;
    case 'HH:mm AP':
        value = params.hrs12 + ':' + params.mts + ' ' + params.amPm;
        break;
    };
    return value;
}	
/**
 * Updates the local time
 */
hmiDateTime.prototype.updateValue = function () {
	var dt = new Date();
	this.setValue('value', dt);
};

/**
 * Setting the value of the DateTime widget
 * @param {String} the The tag name
 * @param {Object} newValue The new value of widget
 */
hmiDateTime.prototype.setValue = function (tag, newValue) {

    if (tag == 'value') {
		if ($.type(newValue).toLowerCase() !== 'date')
			return false;
			
        if (this.value !== newValue) {
		    var strValue = this.formatValue(this.format, newValue);
        		// store date object
        	this.value = newValue;
        	$(this.elem).html(strValue);
        }
    } else {
        hmiWidget.prototype.setValue.call(this, tag, newValue);
    }
};
/**
 * Function to get the value of the Widget
 * @param {String} tag tag name will be the property name
 */
hmiDateTime.prototype.getValue = function (tag) {
    if (tag == "value") {
    		// return Date object
        return this.value;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};
/**
 * Setting the value of the DateTime widget; custom setValue funcition for special purpsoe. Applicable only for Server based dates/times
 * @param {String} tag The tag name
 * @param {Object} newValue The new value of widget
 */
hmiDateTime.prototype.setValueFromServer = function (tag, newValue) {
    if (this.isBadValue(newValue)) {
        return false;
    }
    if (this.value === newValue) {
        this.restartTimer();
        return false;
    }
    this.setValue('value', newValue);
};
/**
 * Restarts the timer
 */
hmiDateTime.prototype.restartTimer = function () {
    if (this.timer) {
        clearTimeout(this.timer);
    }
    var me = this;
    me.timer = setInterval(function () {
        me.updateValue();
    }, me.interval);
};

$hmi.fn.hmiDateTime = function (options, parentPage) {
    return new hmiDateTime(this.wgtId, options, parentPage);
};;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiMsgText(wgtId, options, parentPage) {
    // do nothing for default constructor
    if (!wgtId) return;

    this.dataLinks = [];
    this.value = null;
    this.numStates = 0;
    hmiWidget.call(this, wgtId, options, parentPage);
    	// set initial state
    this.msgElems = this.elem.getElementsByTagName('span');
    if (this.msgElems) 
    	this.numStates = this.msgElems.length;
    	// set a default message value
     if (!this.value)
     	this.setValue('value', 0);
}
/**
 * Inheriting the base class Widget
 */
hmiMsgText.prototype = new hmiWidget();

/**
 * Adds the DatLink widgets
 * @param {Object} newLink DataLink widget instance
 */
hmiMsgText.prototype.addDataLink = function (newLink) {
    this.dataLinks.push(newLink);
};
/**
 * Setting the value of the MessageText widget
 * @param {String} tag The tag name
 * @param {Number} newValue The widget value
 */
hmiMsgText.prototype.setValue = function (tag, newValue) {
    if (tag == "value") {
	    if (this.isBadValue(newValue)) {
	        return false;
	    }
	    newValue = parseFloat(newValue);
        if (isNaN(newValue)) {
            return false
        }
        if (this.value === parseInt(newValue)) {
            return false;
        }
        this.value = parseInt(newValue);
        if (this.numStates > 0) {
            $(this.msgElems).hide();
            if (this.value >= 0 && this.value < this.numStates && this.elem) {
                this.elem.getElementsByTagName('span')[this.value].style.display = 'block';
            }
        }
    } else {
        hmiWidget.prototype.setValue.call(this, tag, newValue)
    }
};
/**
 * Function to get the value of the Widget
 * @param {String} tag tag name will be the property name
 */
hmiMsgText.prototype.getValue = function (tag) {
    if (tag == "value") {
        return this.value;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};
$hmi.fn.hmiMsgText = function (options, parentPage) {
    return new hmiMsgText(this.wgtId, options, parentPage);
};;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiIndicator(wgtId, options, parentPage) {
    // do nothing for default constructor
    if (!wgtId) return;

    this.dataLinks = [];
    this.type = "image";
    	// red, yellow, green
    this.colors=['red','yellow', 'lime'];
    this.numStates = 3;
    this.imgWidth = 32;
    this.imgX = 0;
    this.imgY = 0;
    this.curState = 0;
    hmiWidget.call(this, wgtId, options, parentPage);
    
         // set the initial state     
	this.setValue('value', this.curState);
}
/**
 * Inheriting the base class Widget
 */
hmiIndicator.prototype = new hmiWidget();

/**
 * Setting the value of the Indicator(Light) widget
 * @param {String} tag The tag name
 * @param {Number} newValue The new widget value
 */
hmiIndicator.prototype.setValue = function (tag, newValue) {
    if (tag == 'value') {
	    if (this.isBadValue(newValue)) {
	        return false;
	    }
        newValue = parseFloat(newValue);
        if (isNaN(newValue)) {
            return false
        }
		this.setState(newValue);
    } else {
        hmiWidget.prototype.setValue.call(this, tag, newValue);
    }
};
/**
 * Function to get the value of the Widget
 * @param {String} tag tag name will be the property name
 */
hmiIndicator.prototype.getValue = function (tag) {
    if (tag == "value") {
        return this.curState;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};

hmiIndicator.prototype.setState = function (newValue) {
    var value = parseInt(newValue) % this.numStates;
    var index = value;
    	// support for not consecutive indicies
    if (this.indicies)
    	index = this.indicies.indexOf(value);
    	
    if (this.type==="color") {
    	var color = this.colors[index];
    	var isOff = ((color=='none')||(color==='off')) ? 1 : 0;
     	this.elem.style.backgroundColor = isOff ? '#555' : color;
    	if (isOff) {
    		$(this.elem).css('box-shadow', 'none');
    		$(this.elem).css('-webkit-box-shadow', 'none');
    	} else {
   			$(this.elem).css('box-shadow', '0px 0px 20px 1px '+color);
   			$(this.elem).css('-webkit-box-shadow', '0px 0px 20px 1px '+color);
		}    		
    } else {
        var absValue = Math.abs(index);
        // select the image in the image list (use neg values for images)
        var imgOffset = -this.imgX - (absValue * this.imgWidth);
        if (this.curState != absValue) {
            this.curState = absValue;
            $(this.elem).css('background-position', imgOffset + 'px ' + -this.imgY + 'px');
        }
    }
};

$hmi.fn.hmiIndicator = function (options, parentPage) {
    return new hmiIndicator(this.wgtId, options, parentPage);
};;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiNeedle(wgtId, options, parentPage) {
    // do nothing for default constructor
    if (!wgtId) return;

	this.type='round';
    this.direction = 1; // 1 = clockwise
    this.min = 0.0;
    this.max = 100.0;
    this.startAngle = 0.0;
    this.stopAngle = 90.0;
    this.initAngle = 180.0;
    this.imgCx = 0.0;
    this.imgCy = 0.0
    this.initial = true;
    this.reverse = 0;
    this.value = 0;
    hmiWidget.call(this, wgtId, options, parentPage);

	if (this.type==='round') {
	    this.startAngleRad = this.startAngle * Math.PI / 180;
	    this.stopAngleRad = this.stopAngle * Math.PI / 180;
	    this.initAngleRad = this.initAngle * Math.PI / 180;    
	} else {
	    this.needleElem = this.elem.children[0];    	
	    if (this.length===undefined) {
	    	if (this.type=="vert")
	    		this.length = this.elem.clientHeight-15;
	    	else
	     		this.length = this.elem.clientWidth-15;
	    }
	    this.range = this.max - this.min;
	    	// make sure the range is not 0
	    if (!this.range)
	    	this.range = 100;
	    	
	    if (this.align && this.needleElem) {
	    	if ((this.type=="vert")&&(this.align=="right")) {
	    		var w = $(this.needleElem).width();
    			var px = this.elem.clientWidth - w;
    			this.needleElem.style['left'] = px + 'px';
	    	} else if ((this.type=="horiz")&&(this.align=="bottom")) {
	    		var h = $(this.needleElem).height();
     			var px = this.elem.clientHeight - h;
   				this.needleElem.style['top'] = px + 'px';
	    	}
	    }	
	}	
    
    if (this.value !== null)
    	this.updateNeedle(this.value);
}
/**
 * Inheriting the base class Widget
 */
hmiNeedle.prototype = new hmiWidget();

hmiNeedle.prototype.render = function () {
	this.updateNeedle(value);
}
/**
 * function updates the needle value
 * @param {Number} value The value of gauge used to update the needle.
 */
hmiNeedle.prototype.updateNeedle = function (value) {
	
	if (this.type==='vert') {
			// vert starts from the bottom
    	var px = this.length - (this.length * (value - this.min) / this.range );
    	if (this.needleElem)
    		this.needleElem.style['top'] = px + 'px';
		
	} else if (this.type==='horiz') {
    	var px = this.length * (value - this.min) / this.range;
     	if (this.needleElem)
   			this.needleElem.style['left'] = px + 'px';
		
	} else {
		var canvas = this.elem.children[0];
	    var me = this;
	    if (canvas) {
	        var ctx = canvas.getContext('2d');
	        if (ctx) {
	            var img = canvas.children[0];
	            //For the first time make sure that the needle image is loaded completely in the browser.
	            if (this.initial) {
		            	// make sure we have a center point set
					if (this.cx==undefined) this.cx = canvas.width/2;
					if (this.cy==undefined) this.cy = canvas.height/2;
	
	                this.initial = false;
	                var imgTmp = new Image();
	                imgTmp.onload = function () {
	                    me.drawRoundNeedle(canvas, ctx, value, img);
	                    delete imgTmp;
	                };
	                imgTmp.src = img.src;
	            } else {
	                me.drawRoundNeedle(canvas, ctx, value, img);
	            }
	        }
	    }
	}
};
/**
 * function that calculates the angle of the needle and rotate it to that angle based on the new value provided
 * @param {Object} canvas The canvas element
 * @param {Object} ctx Canvas element's context
 * @param {Number} value The value of gauge used to update the needle.
 * @param {Object} img The needle image element
 */
hmiNeedle.prototype.drawRoundNeedle = function (canvas, ctx, value, img) {
    var imgTmp
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.translate(this.cx, this.cy);	
	if (this.scale)
		ctx.scale(this.scale.x, this.scale.y);	

    var angle = this.calcTheta(value);
    ctx.rotate(angle);
    ctx.drawImage(img, -this.imgCx, -this.imgCy);	
    
    ctx.restore();
};
/**
 * function calculat theta of a value
 * @param {Number} value The value of gauge used to compute the angle Theta of rotation
 * @return {Number} theta of the provided number
 */
hmiNeedle.prototype.calcTheta = function (value) {
    var angle = (value - this.min) * (this.stopAngleRad - this.startAngleRad) / (this.max - this.min) + this.initAngleRad + this.startAngleRad;
    if (this.reverse == 1) angle = -angle;
    return angle;
};
/**
 * Setting the value of the Needle widget
 * @param {String} tag The tag name
 * @param {Number} newValue The new widget value
 */
hmiNeedle.prototype.setValue = function (tag, newValue) {

    if (tag == 'value') {
	    if (this.isBadValue(newValue)) {
	        return false;
	    }
        newValue = parseFloat(newValue)
        if (isNaN(newValue)) {
            return false
        }
        if (newValue > this.max) newValue = this.max; else if (newValue < this.min) newValue = this.min;
        this.value = newValue;
        this.updateNeedle(newValue);
    } else {
        hmiWidget.prototype.setValue.call(this, tag, newValue);
    }
};

hmiNeedle.prototype.getValue = function (tag) {
    if (tag == "value") {
        return this.value;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};

$hmi.fn.hmiNeedle = function (options, parentPage) {
    return new hmiNeedle(this.wgtId, options, parentPage);
};;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiKnob(wgtId, options, parentPage) {
    	// do nothing for default constructor
    if (!wgtId) return;

	this.type='round';
    this.snap = 1;
    this.min = 0;
    this.max = 2;
    this.startAngle = 0;
    this.stopAngle = 180;
    this.initAngle = 180;
    this.imgCx = 0.0;
    this.imgCy = 0.0
    this.initial = true;
    this.reverse = 0;	// 0 = clockwise
    this.value = 0;
    this.viewScale = {x:1, y:1};
        
    this._clickOffset = null;
    this.dragging = 0;
    hmiWidget.call(this, wgtId, options, parentPage);
    
	this.range = this.max - this.min;
	if (this.range==0) this.range = 1;
    this.startAngleRad = this.startAngle * Math.PI / 180;
    this.stopAngleRad = this.stopAngle * Math.PI / 180;
    this.initAngleRad = this.initAngle * Math.PI / 180;    
    
	this.render();	
            // event handler assignments	
	var self = this;	
	if (this.parentPage) {
		// if parent page, handle mouse clicks globally
		$(self.elem).bind( "mousedown.button", function (evt) {
			$hmi.handleMouse(self);
		});
		$(self.elem).bind("touchstart", function (evt) {
			evt.preventDefault();
			$hmi.handleMouse(self);
		});
	} else {
		// if no parent page, need to handle the mouse clicks in the widget
		$(self.elem).bind( "mousedown.button", function( event ) {
			if ( options.disabled ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			} else if (self) {
           		if (event && event.preventDefault) event.preventDefault(); // need to disable dragging in Firefox
				var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
				self.doMouseDown(evtInfo, event);
			}
		});
		$(self.elem).bind( "mouseup.button", function( event ) {
			if ( options.disabled ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			} else if (self) {
            	if (event && event.preventDefault) event.preventDefault(); 
				var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
				self.doMouseUp(evtInfo, event);
			}
		});
		$(self.elem).bind( "mousemove.button", function( event ) {
			if ( options.disabled ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			} else if (self && self.dragging) {
            	if (event && event.preventDefault) event.preventDefault(); 
				var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
				self.doMouseMove(evtInfo, event);
			}
		});	
		$(self.elem).bind("touchstart", function (event) {
            if (event && event.preventDefault) event.preventDefault(); 
			var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
			self.doMouseDown(evtInfo, event);
		});			
		$(self.elem).bind("touchmove", function (event) {
            if (event && event.preventDefault) event.preventDefault(); // need to disable dragging in Firefox
			var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
			self.doMouseMove(evtInfo, event);
		});	
	}    
}
/**
 * Inheriting the base class Widget
 */
hmiKnob.prototype = new hmiWidget();


hmiKnob.prototype.render = function () {

	var canvas = this.elem.children[0];
    var me = this;
    if (canvas) {
        var ctx = canvas.getContext('2d');
        if (ctx) {
        	var value = this.value;
            var img = canvas.children[0];
            //For the first time make sure that the needle image is loaded completely in the browser.
            if (this.initial) {
	            	// make sure we have a center point set
				if (this.cx==undefined) this.cx = canvas.width/2;
				if (this.cy==undefined) this.cy = canvas.height/2;

                this.initial = false;
                var imgTmp = new Image();
                imgTmp.onload = function () {
                    me.drawRoundThumb(canvas, ctx, value, imgTmp);
                    delete imgTmp;
                };
                imgTmp.src = img.src;
            } else {
                me.drawRoundThumb(canvas, ctx, value, img);
            }
        }
    }
  
}
hmiKnob.prototype.drawRoundThumb = function (canvas, ctx, value, img) {

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.translate(this.cx, this.cy);	
	if (this.scale)
		ctx.scale(this.scale.x*this.viewScale.x, this.scale.y*this.viewScale.y);	
	else if (this.viewScale)
		ctx.scale(this.viewScale.x, this.viewScale.y);
		
    var angle = this._calcTheta(value);
    ctx.rotate(angle);
    ctx.drawImage(img, -this.imgCx, -this.imgCy);	
    
    ctx.restore();
};
/**
 * function calculat theta of a value
 * @param {Number} value The value of gauge used to compute the angle Theta of rotation
 * @return {Number} theta of the provided number
 */
hmiKnob.prototype._calcTheta = function (value) {
	if (value<this.min) value=this.min;
	if (value>this.max) value=this.max;
    var angle = (value - this.min) * (this.stopAngleRad - this.startAngleRad) / (this.max - this.min) + this.initAngleRad + this.startAngleRad;
    if (this.reverse == 1) angle = -angle;
    return angle;
};

/**
 * Setting the value of the Needle widget
 * @param {String} tag The tag name
 * @param {Number} newValue The new widget value
 */
hmiKnob.prototype.setValue = function (tag, newValue) {

    if (tag == "value") {
        newValue = parseFloat(newValue)
        if (isNaN(newValue)) {
            return false
        }
        if (newValue > this.max) newValue = this.max; else if (newValue < this.min) newValue = this.min;
        this.value = newValue;
        this.render();
    } else {
        hmiWidget.prototype.setValue.call(this, tag, newValue)
    }
};
/**
 * Function to get the value of the Widget
 * @param {String} tag tag name will be the property name
 */
hmiKnob.prototype.getValue = function (tag) {
    if (tag == "value") {
        return this.value;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};

/**
 * function that handles the onmousedown event on a hmiSlider's thumb element.
 * @param {Object} evtInfo The event object, custom made one
 * @param {Object} e The original event object
 */
hmiKnob.prototype.doMouseDown = function (evtInfo, e) {

    this.dragging = 1;
    var pos = {
	        x: evtInfo.x,
	        y: evtInfo.y
	    };		
    var normValue = this._normValueFromMouse(pos);

	// need to set value if clicked outside the thumb
    this.setValue("value", normValue);
    this.doWriteValue("value", this.value);

};
/**
 * function that handles the onmouseUp event on a hmiSlider's thumb element.
 * @param {Object} evtInfo The event object, custom made one
 * @param {Object} e The original event object
 */
hmiKnob.prototype.doMouseUp = function (evtInfo, e) {
    this.dragging = 0;
    this._clickOffset = null;
};
/**
 * function that handles the onmouseMove event on a hmiSlider's thumb element.
 * @param {Object} evtInfo The event object, custom made one
 * @param {Object} e The original event object
 */
hmiKnob.prototype.doMouseMove = function (evtInfo, e) {

    this.dragging = 1;
    var position = {
       x: evtInfo.x,
       y: evtInfo.y	
    };
	var normValue = this._normValueFromMouse(position);
    this.setValue("value", normValue);
    this.doWriteValue("value", this.value);
};

/**
 * Function that computes the value based on the clicked position
 * @param {Object} position Contains left and top values of the clicked position
 * @return {Number} The value computed
 */
hmiKnob.prototype._normValueFromMouse = function (pos) {
	var dx = pos.x - this.cx,
		dy = this.cy - pos.y,
		angle = Math.atan2(dy, dx)*180/Math.PI;
	
	var delta = (this.initAngle-angle-this.startAngle)*this.range/(this.stopAngle-this.startAngle);
	var value = this.reverse ? (this.max-delta) : (delta+this.min);

   if(this.snap)
      value = Math.round(value);
      
  return value;

};

$hmi.fn.hmiKnob = function (options, parentPage) {
    return new hmiKnob(this.wgtId, options, parentPage);
};;
/*
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiBarGraph(wgtId, options, parentPage) {
    // do nothing for default constructor
    if (!wgtId) return;

    this.value = undefined;
    this.min = 0.0;
    this.max = 100.0;
    this.length = null;
    this.imgWidth = 32;
    this.imgHeight = 32;
    this.imgX = 0;
    this.imgY = 0;
    this.imgYbase = 0;
    this.nodes = 0;
    this.reverse = 0;
    this.majorTickWidthInPx = 5;
    this.majorTickWidth = 2;
    this.orientation = "h";
    this.BarTypes = {
        kVert              : 0,
        kHoriz             : 1,
        kVertImageClip     : 2,
        kHorizImageClip    : 3,
        kVertImageStretch  : 4,
        kHorizImageStretch : 5,
        kSegments          : 6
    };
    this.barType = this.BarTypes.kVert;
    hmiWidget.call(this, wgtId, options, parentPage);
    
    this.barElem = this.elem.children[0];
    this.range = (this.max - this.min);
    if (this.range <= 0) this.range = 1;

    if (this.type.indexOf("horiz") >= 0)
        this.barType = this.BarTypes.kHoriz;
    if (this.type.indexOf("segment") >= 0)
        this.barType = this.BarTypes.kSegments;
		
    	// make sure this.length is set
    this.length = this.length || ((this.type=="vert") ? this.elem.clientHeight : this.elem.clientWidth);
		// set the initial value
	if (this.value!==undefined)
    	this.setValue('value', this.value); 
}
/**
 * Inheriting the base class Widget
 */
hmiBarGraph.prototype = new hmiWidget();

/**
 * Setting the value of the hmiBarGraph widget
 * @param {String} tag The tag name
 * @param {Number} newValue The widget value
 */
hmiBarGraph.prototype.setValue = function (tag, newValue) {

    if (tag === 'value') {
	    if (this.isBadValue(newValue)) {
	        return false;
	    }
    	newValue = parseFloat(newValue)
        if (isNaN(newValue)) {
            return false
        }
        // make sure we do not exceed the limits
        this.setState(newValue);
    } else if (tag === 'fill') {
    	if (typeof(newValue)==='number') {
	        if (isNaN(newValue)) {
	            return false
	        }
	        this.imgY = this.imgYbase + (newValue + 1) * this.imgHeight;
	        // refresh the widget
	        this.redraw();
	    }
    } else {
        hmiWidget.prototype.setValue.call(this, tag, newValue);
    }
};
/**
 * Function to get the value of the Widget
 * @param {String} tag tag name will be the property name
 */
hmiBarGraph.prototype.getValue = function (tag) {
    if (tag == "value") {
        return this.value;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};
/**
 * Function to set the bargraph value to a new state
 * @param {Number} newValue
 */
hmiBarGraph.prototype.setState = function (newValue) {
    if (newValue > this.max) newValue = this.max;
    if (newValue < this.min) newValue = this.min;
    this.value = newValue;
    this.redraw()
};
/**
 * Function that draws the bargraph's current state
 */
hmiBarGraph.prototype.redraw = function () {
    var barElem = this.barElem;
    if (barElem) {
        if ((this.barType === this.BarTypes.kVert) || (this.barType === this.BarTypes.kVertImageStretch) || (this.barType === this.BarTypes.kVertImageClip)) {
            // vertical
            var pos = this.length - (this.value * this.length / this.range);
            //Vertical bar graph does not sync with the scale and this part will fix that.
            var height = (this.length - pos) + 'px';
            pos = this.orientation === 'v' && parseFloat(this.value) > parseFloat(this.min) && parseFloat(this.value) < parseFloat(this.max) ? pos - 8 : pos;
            var cssStyle = this.reverse ? {
                'top'    : '0px',
                'height' : height
            } : {
                'top'    : pos + 'px',
                'height' : height
            };
            barElem.style.top = cssStyle['top'];
            barElem.style.height = cssStyle['height'];
        } else if ((this.barType === this.BarTypes.kHoriz) || (this.barType === this.BarTypes.kHorizImageStretch) || (this.barType === this.BarTypes.kHorizImageClip)) {
            // horizontal
            pos = this.value * this.length / this.range;
            var cssStyle = this.reverse ? {
                'width' : pos + 'px',
                'left'  : (this.length - pos) + 'px'
            } : {
                'width' : pos + 'px'
            };
            barElem.style.width = cssStyle['width'];
            if (typeof cssStyle['left'] !== 'undefined') {
                barElem.style.left = cssStyle['left'];
            }
        } else if (this.barType === this.BarTypes.kSegments) {
            // shift the image in the image list (use neg values for images)
            var state = Math.ceil(this.value / this.range * this.nodes);
            var imgOffset = -this.imgX - (state * this.imgWidth);
            barElem.style.backgroundPosition = imgOffset + 'px ' + -this.imgY + 'px';
        }
    }
};
$hmi.fn.hmiBarGraph = function (options, parentPage) {
    return new hmiBarGraph(this.wgtId, options, parentPage);
};;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiSlider(wgtId, options, parentPage) {
    // do nothing for default constructor
    if (!wgtId) return;
    this.type='vert';
    this.min = 0;
    this.max = 100;
    this.range = 100;
    this.thumbElem = null;
    this.imgW = 50;
    this.imgH = 37;
    this.value = 0;
    this.numFormat = "#";
    this._clickOffset = null;
    this.dragging = 0;
    hmiWidget.call(this, wgtId, options, parentPage);
		// need to get the margin values to position the thumb correctly
    this.marginX = parseInt($(this.elem).css('margin-left'));	
    this.marginY = parseInt($(this.elem).css('margin-top'));
    	
    this.thumbElem = this.elem.children[0];
//    var pos = $hmi.wgtPagePos(this.elem);
//    this.pageX = pos.left;
//    this.pageY = pos.top;
    if (this.type=='horiz')
    	this.isVert=false;
    else
    	this.isVert=true;
    	

    if (this.length===undefined) {
    	if (this.isVert)
    		this.length = this.elem.clientHeight;
    	else
     		this.length = this.elem.clientWidth;
    }
    if (this.thumbElem) {
        this.imgW = this.thumbElem.clientWidth;
        this.imgH = this.thumbElem.clientHeight;
/*        
     	if (this.isVert)
    		this.length += this.imgH/2;
    	else
     		this.length += this.imgW/2;
*/
	}
	this.range = this.max - this.min;

	this.render();	
            // event handler assignments	
	var self = this;	
	if (this.parentPage) {
		// if parent page, handle mouse clicks globally
		$(self.elem).bind( "mousedown.button", function (evt) {
			$hmi.handleMouse(self);
		});
		$(self.elem).bind("touchstart", function (evt) {
			evt.preventDefault();
			$hmi.handleMouse(self);
		});
	} else {
		// if no parent page, need to handle the mouse clicks in the widget
		$(self.elem).bind( "mousedown.button", function( event ) {
			if ( options.disabled ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			} else if (self) {
           		if (event && event.preventDefault) event.preventDefault(); // need to disable dragging in Firefox
				var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
				self.doMouseDown(evtInfo, event);
			}
		});
		$(self.elem).bind( "mouseup.button", function( event ) {
			if ( options.disabled ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			} else if (self) {
            	if (event && event.preventDefault) event.preventDefault(); 
				var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
				self.doMouseUp(evtInfo, event);
			}
		});
		$(self.elem).bind( "mousemove.button", function( event ) {
			if ( options.disabled ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			} else if (self && self.dragging) {
            	if (event && event.preventDefault) event.preventDefault(); 
				var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
				self.doMouseMove(evtInfo, event);
			}
		});	
		$(self.elem).bind("touchstart", function (event) {
            if (event && event.preventDefault) event.preventDefault(); 
			var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
			self.doMouseDown(evtInfo, event);
		});			
		$(self.elem).bind("touchmove", function (event) {
            if (event && event.preventDefault) event.preventDefault(); // need to disable dragging in Firefox
			var evtInfo = $hmi.mouseMgr.wgtEventInfo(self, event);
			self.doMouseMove(evtInfo, event);
		});	
	}    
}
/**
 * Inheriting the base class Widget
 */
hmiSlider.prototype = new hmiWidget();

/**
 * Setting the value of the Slider widget
 * @param {String} tag The tag name
 * @param {Number} newValue The new widget value
 * @param {[Number]} isDragging An optional parameter to distinguish setValue calls from within the onmousemove and onmousedown routines with other ones
 */
hmiSlider.prototype.setValue = function (tag, newValue) {

    if (tag == "value") {
	    if (this.isBadValue(newValue)) {
	        return false;
	    }
        newValue = parseFloat(newValue);
        if (isNaN(newValue)) {
            return false;
        }
        if (newValue > this.max) {
            newValue = this.max
        } else {
            if (newValue < this.min) {
                newValue = this.min
            }
        }
        if (this.value != newValue) {
            this.value = newValue;
			this.render();
            this.sendUpdate(tag, newValue)
        }
    } else {
        hmiWidget.prototype.setValue.call(this, tag, newValue)
    }
};
hmiSlider.prototype.render = function () {
    var valPercent = (this.value - this.min) / (this.range) * 100;
    if (this.thumbElem) {
    	if (this.isVert) {
    			// vert starts from the bottom
        	var px = this.length - (this.length * valPercent / 100) - this.imgH/2;
	    	this.thumbElem.style['top'] = px + 'px';
        } else {
        	var px = (this.length * valPercent / 100) - this.imgW/2;
        	this.thumbElem.style['left'] = px + 'px';
        }
    }
}
/**
 * Function to get the value of the Widget
 * @param {String} tag tag name will be the property name
 */
hmiSlider.prototype.getValue = function (tag) {
    if (tag == "value") {
        return this.value;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};
/**
 * Function that sets the initial value of the widget need not be accountable as this should not invoke onDataUpdate event
 * @param {Number} value The initial widget value set in the JM project
 */
hmiSlider.prototype.setInitialValue = function (value) {
    if (value > this.max) {
        value = this.max
    } else {
        if (value < this.min) {
            value = this.min
        }
    }
    if (this.value === null) {
        this.value = parseFloat(value);
        this.render();
    }
};
/**
 * function that handles the onmousedown event on a hmiSlider's thumb element.
 * @param {Object} evtInfo The event object, custom made one
 * @param {Object} e The original event object
 */
hmiSlider.prototype.doMouseDown = function (evtInfo, e) {

    this.dragging = 1;
    var pos;
    if (evtInfo.isInThumb) {
		this._clickOffset = {x:evtInfo.cx-this.imgW/2, y:evtInfo.cy-this.imgH/2 };
		pos = {
	        x: evtInfo.x-this._clickOffset.x,
	        y: evtInfo.y-this._clickOffset.y
	    };
	} else {

			// if clicking outside the thumb, subtract offset so thumb is in center of click point
		this._clickOffset = {x:0, y:0 };
	    pos = {
	        x: evtInfo.x-this._clickOffset.x,
	        y: evtInfo.y-this._clickOffset.y
	    };		
	}
    var normValue = this._normValueFromMouse(pos);

	// need to set value if clicked outside the thumb
    this.setValue("value", normValue);
    this.doWriteValue("value", this.value);

};
/**
 * function that handles the onmouseUp event on a hmiSlider's thumb element.
 * @param {Object} evtInfo The event object, custom made one
 * @param {Object} e The original event object
 */
hmiSlider.prototype.doMouseUp = function (evtInfo, e) {
    this.dragging = 0;
    this._clickOffset = null;
};
/**
 * function that handles the onmouseMove event on a hmiSlider's thumb element.
 * @param {Object} evtInfo The event object, custom made one
 * @param {Object} e The original event object
 */
hmiSlider.prototype.doMouseMove = function (evtInfo, e) {

    this.dragging = 1;
    var position = {
       x: evtInfo.x - this._clickOffset.x,
       y: evtInfo.y - this._clickOffset.y
    };
	var normValue = this._normValueFromMouse(position);
    this.setValue("value", normValue);
    this.doWriteValue("value", this.value);
};

/**
 * Function that computes the value based on the clicked position
 * @param {Object} position Contains left and top values of the clicked position
 * @return {Number} The value computed
 */
hmiSlider.prototype._normValueFromMouse = function (pos) {

	var pxMouse = this.isVert ? pos.y : pos.x;
	var pctMouse = pxMouse / this.length;
    if (pctMouse > 1) {
        pctMouse = 1;
    } else if (pctMouse < 0) {
        pctMouse = 0;
    }
    if (this.isVert) {
        pctMouse = 1 - pctMouse;
    }

    var value = this.min + (pctMouse * this.range);
    return value.toFixed(2);

};
$hmi.fn.hmiSlider = function (options, parentPage) {
    return new hmiSlider(this.wgtId, options, parentPage);
};;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 

function hmiAnalogClock(wgtId, options, parentPage) {
	
    // do nothing for default constructor
    if (!wgtId) return;

	this.hrs = 0;
	this.mins = 0;
	this.secs = 0;
	this.timeMs = 0;
	this.showSecs = true;
	this.hrsImg = null;
	this.minsImg = null;
	this.secsImg = null;
    this.tickTimer = null;	

    hmiWidget.call(this, wgtId, options, parentPage);

		// set initial time values (do before creating the needles)
	var dt = new Date();
	this.timeMs = dt.getTime();
	this.secs = dt.getSeconds();
	this.mins = dt.getMinutes();
	this.hrs = dt.getHours();
		// create the needles
	this.initNeedles();
    // tell the page we need to be started and stopped
    if (parentPage) {
	    parentPage.bind('pagestart', this);
	    parentPage.bind('pagestop', this);
	} else {
		this.start();
	}	
};

hmiAnalogClock.prototype = new hmiWidget();

hmiAnalogClock.prototype.setValue = function (tag, newValue) {
    if (this.isBadValue(newValue)) {
        return false;
    }
    if (tag === 'showSecs') {
		this.showSecs = newValue ? true : false
    } else {
        hmiWidget.prototype.setValue.call(this, tag, newValue);
    }
}

hmiAnalogClock.prototype.getValue = function (tag) {
    if (tag == "showSec") {
        return this.showSecs;
    } else {
        return hmiWidget.prototype.getValue.call(this, tag);
    }
};

hmiAnalogClock.prototype.render = function () {
    var elems = this.elem.getElementsByTagName('canvas');
    if (elems && elems.length>0) {
    	var canvas = this.elems[0];
	    ctx.save();
	    ctx.clearRect(0, 0, canvas.width, canvas.height);
	    if (this.hrsImg)
			this.drawNeedle(ctx, this.hrsImg, this.hrsCtr, this.hrs);
		if (this.minsImg)
			this.drawNeedle(ctx, this.minsImg, this.minsCtr, this.mins);
		if (this.showSecs && this.secsImg) {
			this.drawNeedle(ctx, this.secsImg, this.secsCtr, this.secs);
		}
		ctx.restore();
	}
}
hmiAnalogClock.prototype.initNeedles = function () {
	var urlToFile = function( text ) {
		var strFile;
		var idx1 = text.indexOf('(');
		if (idx1>=0) {
			var idx2 = text.indexOf(')', idx1);
			if (idx2>idx1) {
				strFile=text.substring(idx1+1, idx2);
					// remove quote characters (not sure why they are there but they are)
				strFile = strFile.replace(/\"/g,'');
				strFile = strFile.replace(/\'/g,'');
			}
		}
		return strFile;
	};	
	var textToPt = function( text ) {
		var pt = { x:0, y:0 };
		var vals = text.split('px');
		if (vals.length>0)
			pt.x = parseInt(vals[0]);
		if (vals.length>1)
			pt.y = parseInt(vals[1]);
		return pt;	
	};	
 
    var elems = this.elem.getElementsByTagName('canvas');
    if (elems && elems.length>0) {
    	var canvas = elems[0];
		if (canvas) {
	    		// needle images are stored as CSS bkgd images of a canvas element
		    	//  using CSS allows us to provide different themes for the needles in the future
		    	// (note: need to use jquery css to get true css during load time) 
		    var strBkImgAttr = "background-image",
		    	strBkPosAttr = "background-position",
		    	strBkgdImgs = $(canvas).css(strBkImgAttr),
		    	strBkgdPos = $(canvas).css(strBkPosAttr);
		    	
		    bkgdImgs = strBkgdImgs ? strBkgdImgs.split(',') : [];
		    bkgdPos = strBkgdPos ? strBkgdPos.split(',') : [];
		    if (bkgdPos.length>0)
		    	this.hrsCtr = textToPt(bkgdPos[0]);
		    if (bkgdPos.length>1)
		    	this.minsCtr = textToPt(bkgdPos[1]);
		    if (bkgdPos.length>2)
		    	this.secsCtr = textToPt(bkgdPos[2]); 	  
		    	
		   $(canvas).css(strBkImgAttr, "none");  	
		   $(canvas).css(strBkPosAttr, "none");  	
//		   $(canvas).css('background-repeat', "none");  		

				// make sure we have a center point set
			if (this.cx==undefined) this.cx = canvas.width/2;
			if (this.cy==undefined) this.cy = canvas.height/2;

				// create and draw the needle
			var ctx = canvas.getContext('2d');
		    if (ctx) {
			    ctx.save();
			    ctx.clearRect(0, 0, canvas.width, canvas.height);
			    var hrs = this.hrs>12 ? this.hrs-12 : this.hrs;
			    hrs = (hrs+this.mins/60)*5;
		        if (bkgdImgs.length>0)
			    	this.hrsImg = this.createNeedle(ctx, urlToFile(bkgdImgs[0]), this.hrsCtr, hrs);
			    if (bkgdImgs.length>1)
			    	this.minsImg = this.createNeedle(ctx, urlToFile(bkgdImgs[1]), this.minsCtr, this.mins);
			    if (bkgdImgs.length>2)
			    	this.secsImg = this.createNeedle(ctx, urlToFile(bkgdImgs[2]), this.secsCtr, this.secs);
			   	ctx.restore();		
			}

		}
	}	
}

hmiAnalogClock.prototype.createNeedle = function (ctx, imgFile, imgCtr, value) {
    var me = this;
 	var img = new Image();
		// need to draw the first time
	img.onload = function () {
        me.drawNeedle(ctx, img, imgCtr, value);
    };
	img.src = imgFile;
	return img;
}

hmiAnalogClock.prototype.updateClock = function () {

    var elems = this.elem.getElementsByTagName('canvas');
    if (elems && elems.length>0) {
    	var canvas = elems[0];
		if (canvas) {
				// make sure we have a center point set
			if (this.cx==undefined) this.cx = canvas.width/2;
			if (this.cy==undefined) this.cy = canvas.height/2;
				// create and draw the needle
			var ctx = canvas.getContext('2d');
		    if (ctx) {
			    ctx.clearRect(0, 0, canvas.width, canvas.height);
			    var hrs = this.hrs>12 ? this.hrs-12 : this.hrs;
			    hrs = ((hrs+this.mins/60)*5);
			    if (this.hrsImg) 
			    	this.drawNeedle(ctx, this.hrsImg, this.hrsCtr, hrs);
			    if (this.minsImg)
			    	this.drawNeedle(ctx, this.minsImg, this.minsCtr, this.mins);		
			    if (this.secsImg)
			    	this.drawNeedle(ctx, this.secsImg, this.secsCtr, this.secs);		
			}

		}
	}	
};
hmiAnalogClock.prototype.doTick = function () {
	var dt = new Date();
	this.timeMs = dt.getTime();
	this.secs = dt.getSeconds();
	this.mins = dt.getMinutes();
	this.hrs = dt.getHours();
	this.updateClock();
}

hmiAnalogClock.prototype.drawNeedle = function (ctx, img, imgCtr, value) {
	ctx.save();
    ctx.translate(this.cx , this.cy);
    	// value is in secs.  360deg = 60 ticks.  init angle=90
    var angle =  (value * 360 / 60 - 90)*Math.PI/180;
    ctx.rotate(angle);
    if (this.scale) {
    	var x = imgCtr.x*this.scale.x,
    		y =  imgCtr.y*this.scale.y,
    		w = img.width * this.scale.x,
    		h = img.height * this.scale.y;
    	ctx.drawImage(img, -x, -y, w, h);
    } else {
    	ctx.drawImage(img, -imgCtr.x, -imgCtr.y);
    }
    ctx.restore();
};
hmiAnalogClock.prototype.start = function () {
    var strTickFunc = "$hmi('" + this.wgtId + "').widget().doTick();";
    this.tickTimer = setInterval(strTickFunc, 1000);
};

hmiAnalogClock.prototype.stop = function () {
	if (this.tickTimer)
		clearInterval(this.tickTimer);
    this.tickTimer = null;
};

$hmi.fn.hmiAnalogClock = function (options, parentPage) {
    return new hmiAnalogClock(this.wgtId, options, parentPage);
};;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiVariables(wgtId, options, parentPage) {
	hmiWidget.call(this, wgtId, options, parentPage);	
}
hmiVariables.prototype = new hmiWidget();

hmiVariables.prototype.setValue = function (tag, newValue) {
	this[tag] = newValue;
    	// tell any jquery widgets that we changed
	$(this.elem).trigger('change.'+tag, {tag:tag, value:newValue} );   	
};
hmiVariables.prototype.getValue = function (tag) {
	return this[tag];
};
hmiVariables.prototype.addVar = function (varName, value) {
	if (arguments.length == 2)
   		this[varName] = value;
   	else
   		this[varName] = null;
};

$hmi.fn.hmiVariables = function(options, parentPage) {
	return new hmiVariables(this.wgtId, options, parentPage);
};

;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
(function( $ ) {
  $.fn.hmiVal = function(value) {

 	return this.each(function() {
	  	var $this = $(this);
	  	hmiWgt = $this.data('hmiWgt');		  	
	  	if (hmiWgt) {
	  			// writing a value
	  		if (value !== undefined) {
	  			return hmiWgt.setValue(tag, value);
	  		}

	  		return hmiWgt.getValue(tag);
	  	} else {
	  		return $this.val(value);
	  	}	
	});

  };	
  $.fn.hmiProp = function(tag, value) {
		// writing a  value
	if (value !== undefined) {
		return this.each(function() {
	  		var $this = $(this);			
		  	hmiWgt = $this.data('hmiWgt');		  	
		  	if (hmiWgt) {
				hmiWgt.setValue(tag, value);
			}else {
		  		if (tag==="value") {
		  			$this.val(value);
		  		} else {
		  			$this.prop(tag, value);
		  		}				
			}
		});
	}else if (typeof tag==="object") {
		return this.each(function() {
	  		var $this = $(this);				
		  	hmiWgt = $this.data('hmiWgt');		  			  	
		  	if (hmiWgt) {
				for ( var i in tag ) {
					hmiWgt.setValue(i, tag[i]);
				}
			} else {
	  			$this.prop(tag);				
			}
		});
	} else {
	  	var $this = $(this);		
		hmiWgt = $this.data('hmiWgt');		  			  	
	  	if (hmiWgt) {
	  		return hmiWgt.getValue(tag);
	  	} else {
	  		if (tag==="value") {
	  			return $this.val();
	  		} else {
	  			return $this.prop(tag, value);
	  		}
	  	}	  				
	}
  };
  $.fn.hmiAttach = function(dataWgtId, tag) {

 	return this.each(function() {
	  	var $this = $(this),
	  		strBind;	
    	// use jquery to bind to the widget
    	strBind = 'change.'+tag.tag;
    	$(dataWgtId).bind(strBind, tag, function(event, newTag) {
    		var attr = event.data.attr || 'value',
    			srcVal;
    		if (newTag !== undefined) {
   				srcVal = newTag.value;
    		} else {
				srcVal = $(dataWgtId).hmiProp(event.data.tag);
			}
			if (srcVal!==undefined)
    			$this.hmiProp(attr, srcVal);
    	});
    		// if widgets writes, then bind the datasource to the widget
		if ((tag.rw==='rw')||(tag.rw==='w')) {
			var attr = tag.attr || 'value';
    		strBind = 'change.'+attr;
	    	$this.bind(strBind, tag, function(event, newTag) {
	    		var srcVal;
	    			// if binding internal newTag will be set, if binding to 3rd party newTag is null
	    		if (newTag) {
	    			srcVal = newTag.value;
	    		} else {
	    			var attr = event.data.attr || 'value';
					srcVal = $(dataWgtId).hmiProp(attr);
				}
				if (srcVal!==undefined)
					$(dataWgtId).hmiProp(event.data.tag, srcVal);
	    	});
    	}			
	});
  };  
})( jQuery );


;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {

$.widget( "hmi.hmiWidget", {
	
	options: {

	},
	defClasses: "hmi-wgt",
	hmiObj: null,
	hmiElem: null,
	
	_create: function() {

	},
	_createWidget: function( options, element ) {
		this.hmiElem = element;
		$.Widget.prototype._createWidget.call( this, options, element );
	},	
	defaultOptions: function( options, element ) {
		if (options.fx) {
			var fxOpts = options.fx;
			if (typeof fxOpts === "object") {
				if ($.isArray(fxOpts)) { 
					
				} else {
					
				}
			} else if (typeof fxOpts === "string") {
				this._addFx(fxOpts, options, element);
			} 
		}
			// allow the user to change the radius to get the best effect
		if (options.radius)	
			this.element.css("border-radius", options.radius);	

	},

	initWidget: function( wgt ) {
		this.hmiObj = wgt;
		$(this.element).data('hmiWgt', wgt);
	},
	widget: function() {
		return this.element;
	},
	hmiObject: function() {
		return this.hmiObj;
	},
	destroy: function() {
		$.Widget.prototype.destroy.call( this );
	},
	_addFx: function(strFx, options, element) {
		var fxOb = $hmi.getFx(strFx);
		if (fxOb && fxOb.effect) {
			fxOb.effect(options, element);
		} else {
			element.addClass('hmi-fx-'+strFx);
		}
	},
	_eventInfo: function(elem, e) {
	    var evt;
	    var evtTgt;
	    if (e && typeof e.originalEvent.touches === "object") {
	        if (e.originalEvent.touches.length <= 0) return;
	        evt = e.originalEvent.touches[0];
	        evtTgt = evt.target;
	    } else {
	        evt = e || event;
	        evtTgt = evt.srcElement || evt.target;
	    }
	    var inThumb = false;
	    var posx = 0;
	    var posy = 0;
	    	// todo: need to set or delete these values for jmWidgets
	    var wgtClickCx = 0;
	    var wgtClickCy = 0;
	    var isMouseDown = true;
	    if (evt.pageX || evt.pageY) {
	        posx = evt.pageX+this.scrollLeft;
	        posy = evt.pageY+this.scrollTop;
	    } else if (evt.clientX || evt.clientY) {
	        posx = evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
	        posy = evt.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	    }
	    if (elem != evtTgt) {
	        evtTgt = evtTgt.parentNode;
	        if (elem == evtTgt) 
				inThumb = true;
	    }
	    var localX = 0;
	    var localY = 0;
	    if (elem) {
	        if (elem.pageX) 
				localX = posx - elem.pageX;
	        if (elem.pageY) 
				localY = posy - elem.pageY;
	    }
	    return {
	        wgt: elem,
	        isInThumb: inThumb,
	        isMouseDown: isMouseDown,
	        pageX: posx,
	        pageY: posy,
	        x: localX,
	        y: localY,
	        cx: wgtClickCx,
	        cy: wgtClickCy
	    };
	},	
	setValue: function (tag, newValue) {
			// pass on to the widget
		if (this.hmiObj!=undefined)
			this.hmiObj.setValue(tag, newValue);
	},	
	getValue: function (tag) {
			// pass on to the widget
		if (this.hmiObj!=undefined)
			return this.hmiObj.getValue(tag);
		else
			return null;
	},	
		// utility functions
	_cssUrlToFile: function( text ) {
		return text.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
	},	
	_textToPt: function( text ) {
		var vals = text.trim().split(' ');
		return {
			x: (vals.length>0) ? parseFloat(vals[0]) : 0,
			y: (vals.length>1) ? parseFloat(vals[1]) : 0
		};
	},	
	_calcBorderRadCSS: function(strBdr, defBkImgSize) {
		var strNewBdr = strBdr;
			// only update pixel based borders (don't change % borders)
		if (strBdr.indexOf('px')>0) {
			var w = this.element.outerWidth(),
				h = this.element.outerHeight(),
				min = Math.min(w, h);	// radius should always be round so use min value
				bdr = parseInt(strBdr),
				radX = bdr/defBkImgSize.width * min,
				radY = bdr/defBkImgSize.height * min;
			
			strNewBdr = parseInt(radX)+"px "+parseInt(radY)+"px";
		}			
			
		return strNewBdr;		
	},	
	_calcBkSizeCSS: function(strBkSize, len, isVert) {			
		var sizes = strBkSize.split(',');			
			// assume always have 3 parts to image
		if (sizes.length===3) {
			var partA = this._textToPt(sizes[0]);
			var partB = this._textToPt(sizes[1]);
			
			if (isVert) {
				var newH = len-partA.y-partB.y;	
				strBkSize = "100% "+partA.y+"px, 100% "+partB.y+"px, 100% "+newH+"px";	
			} else {
				var newW = len-partA.x-partB.x;	
				strBkSize = partA.x+"px 100%,"+partB.x+"px 100%,"+newW+"px 100%";	
			}
		}
						
		return strBkSize;		
	},				
});

}( jQuery ) );
;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {


$.widget( "hmi.hmiPage", $.hmi.hmiWidget, {

	options: {
		text: null
	},


	_create: function() {
		var defClasses = "hmi-wgt hmi-page";
		var options = this.options;
		var self = this;
			
		this.element
			.addClass( defClasses )
			.attr( "role", "page" )
			;
			// handle page events
		$(this.element).bind('pagestart', function() {
			if (self.hmiObj)
				self.hmiObj.trigger('pagestart');
		});
		
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiPage(wgtId,options));	
	},
	
});

}( jQuery ) );
;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
(function( $, undefined ) {


$.widget( "hmi.hmiButton", $.hmi.hmiWidget, {

	options: {
		shape: 'rect',
		isToggle: false,
		style: 'shiney',
		type: 'standard',
		text: null,
		downClass: null,
		defBkImgSize: {width:150, height:150}
	},
	defClasses: "hmi-wgt hmi-btn ",
	
	_create: function() {
		var options = this.options;
		var self = this;
	
		var upClass = "hmi-btn-"+options.shape;
		this.defClasses += upClass;
		if (options.shape==="rrect") 
			options.type = "css-box";

		if (options.style)	
			this.defClasses += " hmi-btn-"+options.shape+"-"+options.style;	
						
		this.element
			.addClass( this.defClasses )
			.attr( "role", "button" );
			
		if (options.type==="css-box") {
			options.downClass = upClass+"-down";
				// adjust bkgd image width
			var strBkSize = this._calcBkSizeCSS( this.element.css('background-size'), this.element.outerWidth() );
			if (strBkSize)
				this.element.css('background-size', strBkSize);
				// adjust border radius
			if (!options.radius && (options.shape==='rrect')) {
					// need to assume border is 20px by default since browsers do not return border radius reliably
//				var strCurRad = this.element.css('border-radius');
				var strRad = this._calcBorderRadCSS("20px", options.defBkImgSize);
				this.element.css('border-radius', strRad);
			}
		}
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiButton(wgtId, options));	
	},
	_init: function() {

	},	
	destroy: function() {
		this.element
			.removeClass( this.defClasses )
			.removeAttr( "role" );

		$.hmi.widget.prototype.destroy.call( this );
	},
	_setOption: function( key, value ) {
		$.hmi.widget.prototype._setOption.apply( this, arguments );
		if (!this.hmiObj)
			return;
		if ( key === "state" ) {
            this.hmiObj.setValue('value', value);
			return;
		}
	},	
	
		
});

}( jQuery ) );
;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {


$.widget( "hmi.hmiBorder", $.hmi.hmiWidget, {

	options: {
		bkImgSize: {width:150, height:150},
		shape: 'rect'
	},

	_create: function() {
		var myClass,
			options = this.options,
			self = this;
		
		this.defClasses = "hmi-bdr";	
		if (options.style && (options.style!=="default")) 
			myClass = " hmi-bdr-"+options.shape+"-"+options.style;
		else
			myClass = " hmi-bdr-"+options.shape;			
								
		this.element
			.addClass( this.defClasses )
			.attr( "role", "border" );
	
		var jq = $(this.element),
			pad = {},
			newPad = {},
			w = parseInt(jq.width()),
			h = parseInt(jq.height());
			
			// check if we have the padding saved in cache
		if (window.$hmicss && $hmicss[myClass]) {
			pad = $hmicss[myClass].padding;
		} 
			// if not read it from jq
		if (!pad.str) {
			pad.top =  jq.css('padding-top');
			pad.right =  jq.css('padding-right');
			pad.bottom =  jq.css('padding-bottom');
			pad.left = jq.css('padding-left');
			pad.str = pad.top+" "+pad.right+" "+pad.bottom+" "+pad.left;
			pad.top =  parseInt(pad.top);
			pad.right =  parseInt(pad.right);
			pad.bottom =  parseInt(pad.bottom);
			pad.left = parseInt(pad.left);
				// cache the padding for next time
			$hmi.cacheCSS(myClass, { padding:pad });
		}
					
		// need to adjust padding so image scales correctly.  % values do not work correctly since it is based on the parent size and parent size can change
		if (pad.str ) {
			var bkgdSize = options.bkImgSize,
				strBkgdSize = this.element.css('background-size'),
				hasBkgdSizeCSS = (this.options.shape!=='round') ? 1 : 0,
				constrain = strBkgdSize.indexOf(',')>0 ? 1 : 0,
				divSize = {width:w, height:h};
		
			if (hasBkgdSizeCSS)
				bkgdSize = this._readBkgdSizeCSS(strBkgdSize, options.bkImgSize);

				// adjust the pad based on the div size
			newPad = this._adjustPad(pad, bkgdSize, divSize, constrain);	
				// update the element
			this.element.css('padding', newPad.str);
			
			if (hasBkgdSizeCSS) {
				var scaleX = pad.left ? newPad.left/pad.left : 1;
				this._adjustBkgdSize(this.element, strBkgdSize, newPad, scaleX);	
			}

		} else {
			newPad = pad;
		}
	
			// allow the user to change the radius to get the best effect
		if (options.radius)	{
			this.element.css("border-radius", options.radius);	
		} else if (options.shape==='rrect') {
				// need to assume border is 30px by default since browsers do not return border radius reliably
//			var strCurRad = this.element.css('border-radius');
			var strRad = this._calcBorderRadCSS( "30px", options.bkImgSize );
			if (strRad)
				this.element.css('border-radius', strRad);
		}
		
			// add glass element if set as an option
		if (options.glass) {

			var glassClass = "hmi-glass-"+options.shape+"-"+options.glass,
				w = jq.width(),		// need to read width and height again after padding set above
				h = jq.height(),
				padL = newPad.left,
				padT = newPad.top;		
			jq.append("<div class='"+glassClass+"' style='position:absolute; left:"+parseInt(padL)+"px; top:"+parseInt(padT)+"px; width:"+parseInt(w)+"px; height:"+parseInt(h)+"px' ></div>");

		}	
			// set background color
	    if (options.fill) 
	        this.element.css('background-color', options.fill);
	     			
		this.defaultOptions(options, this.element);
		
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiBorder(wgtId, options));	
	},
	_adjustPad: function(pad, imgSize, divSize, constrain) {
		var newPad={top:pad.top, right:pad.right, bottom:pad.bottom, left:pad.left};
			
		var pads = pad.str.split(" ");
		if (pads.length>=4) {
			var padPx,
				boxH = imgSize.height-pad.top-pad.bottom,
				boxW = imgSize.width-pad.left-pad.right;
			
			newPad.str = "";
			padPx = pad.top*divSize.height/boxH || 0; 
			newPad.top = padPx;
			newPad.str += newPad.top.toFixed(1) + "px ";
			padPx = pad.right*divSize.width/boxW || 0; 
			newPad.right = (constrain) ? Math.min(padPx, newPad.top) : padPx;
			newPad.str += newPad.right.toFixed(1) + "px ";
			padPx = pad.bottom*divSize.height/boxH || 0; 
			newPad.bottom = padPx;
			newPad.str += newPad.bottom.toFixed(1) + "px ";
			padPx = pad.left*divSize.width/boxW || 0; 
			newPad.left = (constrain) ? Math.min(padPx, newPad.top) : padPx;
			newPad.str += newPad.left.toFixed(1) + "px";

		}
		return newPad;					
	},

	_readBkgdSizeCSS: function(strSize, defSize) {			
		var size = defSize,
			sizes = strSize.split(',');
			
		var strTempSize = sizes[sizes.length-1].trim();
		var parts = strTempSize.split(" ");
		if (parts.length>0) 
			size.width =  parseInt(parts[0]);
			// only use width if there is 1 bkgd image
		if (parts.length>1) 	
			size.height=(sizes.length===1) ? parseInt(parts[1]) : size.width;
						
		return size;		
	},
	_adjustBkgdSize: function(elem, strSize, pad, scaleX) {			
		var strNewSize="";
			
		var sizes = strSize.split(',');	
		if (sizes.length==1) {
			strNewSize = "100% 100%";
			$(elem).css('background-size', strNewSize);
		} else if (sizes.length==3) {
			var outerW = $(elem).outerWidth(),
				valL = pad.left,
				valR = pad.right;
				// the left side is less then the image width so that we don't need to update the
				// image position
			if (sizes[0].indexOf('px')>0) {
				var parts = sizes[0].trim().split(' ');
				valL = parseInt(parts[0])*scaleX;
				strNewSize += parseInt(valL)+"px 100%,";
			} else {
				strNewSize += sizes[0]+",";
			}		
			if (sizes[1].indexOf('px')>0) {
				var parts = sizes[1].trim().split(' ');
				valR = parseInt(parts[0])*scaleX;
				strNewSize += parseInt(valR)+"px 100%,";
			} else {
				strNewSize += sizes[1]+",";
			}
			var valM = outerW-valL-valR+2;
			strNewSize += parseInt(valM)+"px 100%";
			$(elem).css('background-size', strNewSize);
				// adjust the background start postion
				// not good to use fixed values, but IE does not return pos correctly so we need to force fixed values
			var strNewPos = "left top,right top,"+parseInt(valL)+"px top";
			$(elem).css('background-position', strNewPos);
		}
	},
	
});

}( jQuery ) );
;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {


$.widget( "hmi.hmiNumeric", $.hmi.hmiWidget, {

	options: {
		text: null
	},


	_create: function() {
		var defClasses = "hmi-wgt hmi-numeric";
		var options = this.options;
		var self = this;
			
		this.element
			.addClass( defClasses )
			.attr( "role", "numeric" )
			;
			
		this.defaultOptions(options, this.element);
		
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiNumeric(wgtId,options));	
	},
	
});

}( jQuery ) );
;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {


$.widget( "hmi.hmiDateTime", $.hmi.hmiWidget, {

	options: {
		text: null
	},


	_create: function() {
		var defClasses = "hmi-wgt hmi-datetime";
		var options = this.options;
		var self = this;
			
		this.element
			.addClass( defClasses )
			.attr( "role", "datetime" )
			;
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiDateTime(wgtId,options));	
	},
	
});

}( jQuery ) );
;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {

$.widget( "hmi.hmiMsgText", $.hmi.hmiWidget, {

	options: {

	},


	_create: function() {
		var defClasses = "hmi-wgt hmi-msgtext";
		var options = this.options;
		var self = this;
			
		this.element
			.addClass( defClasses )
			.attr( "role", "msgtext" )
			;
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiMsgText(wgtId,options));	
	},
	
});

}( jQuery ) );
;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
(function( $, undefined ) {


$.widget( "hmi.hmiBarGraph", $.hmi.hmiWidget, {

	options: {
		type: 'vert',
		min: 0,
		max: 100
	},
	defClasses: "hmi-wgt hmi-bar",
	
	_create: function() {
		var options = this.options;
		var self = this;
		var myClass="hmi-bar";
		
		if (options.type) {
			myClass += "-"+options.type;
			this.defClasses += " "+myClass;	
		}
			
		this.element
			.addClass( this.defClasses )
			.attr( "role", "bargraph" );
		
		$(this.element).prepend('<div class="'+myClass+'-bar"></div>');

		this.defaultOptions(options, this.element);

		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiBarGraph(wgtId, options));	
	},
	_init: function() {

	},	
	destroy: function() {
		this.element
			.removeClass( this.defClasses )
			.removeAttr( "role" );

		$.hmi.widget.prototype.destroy.call( this );
	},
	
});

}( jQuery ) );
;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {


$.widget( "hmi.hmiIndicator", $.hmi.hmiWidget, {

	options: {
		shape: 'round'

	},
	defClasses: "hmi-wgt hmi-ind",
	
	_create: function() {
		var options = this.options;
		var self = this;
		
		if (options.shape)	
			this.defClasses += " hmi-ind-"+options.shape;	
			
		if (options.style)	
			this.defClasses += " hmi-ind-"+options.shape+"-"+options.style;	

			
		this.element
			.addClass( this.defClasses )
			.attr( "role", "indicator" );
					
		if (options.shape==="rrect") {
				// need to size the bkgd image correctly based on the widget width
			var strBkSize = this._calcBkSizeCSS( this.element.css('background-size'), this.element.outerWidth() );
			this.element.css('background-size', strBkSize);
				// adjust border radius
			if (!options.radius && options.shape==='rrect') {
					// need to assume border is 20px by default since browsers do not return border radius reliably
//				var strCurRad = this.element.css('border-radius');
				var strRad = this._calcBorderRadCSS("20px", options.defBkImgSize);
				this.element.css('border-radius', strRad);
			}
		}
		options.type="color";
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiIndicator(wgtId, options));	
	},
	_init: function() {

	},	
	destroy: function() {
		this.element
			.removeClass( this.defClasses )
			.removeAttr( "role" );

		$.hmi.widget.prototype.destroy.call( this );
	},
	_setOption: function( key, value ) {
		$.hmi.widget.prototype._setOption.apply( this, arguments );
		if (!this.hmiObj)
			return;
		if ( key === "state" ) {
            this.hmiObj.setValue('value', value);
			return;
		}
	},	
		
});

}( jQuery ) );
;
/**
 * JMwidgets 
 * Copyright (c) 2012, BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {


$.widget( "hmi.hmiNeedle", $.hmi.hmiWidget, {

	options: {
		type: 'round'
	},
	defClasses: "hmi-wgt hmi-needle",
	imgCtr: null,
	
	_create: function() {
		var options = this.options;
		var self = this;
		var myClass="hmi-needle";
		
		if (options.type) {
			myClass += "-"+options.type;
			this.defClasses += " "+myClass;	
		}
			
		this.element
			.addClass( this.defClasses )
			.attr( "role", "needle" );
		
		var	jq = $(this.element),
			w = jq.width(),
			h = jq.height();
//			bkgdImgSize = this._textToPt(jq.css('background-size')),
//			bkgdCtr = this._textToPt(jq.css('background-position'));
/*		
		if (bkgdImgSize) {
				// bkgd image is scaled proportianally so get min scale and use for both x and y
			var maxScale = Math.min(w/bkgdImgSize.x, h/bkgdImgSize.y);
			options.scale = {x:maxScale, y:maxScale};
			jq.css('background-size', "100%");
		} 

        
		if (bkgdCtr) {
			options.cx = bkgdCtr.x;
			options.cy = bkgdCtr.y;
			jq.css('background-position', "0 0");
		} 
*/
			// init the needle center point
		options.cx = w/2;
		options.cy = h/2;
		if (options.ctr) {		
			if (options.ctr.x)
				options.cx = options.ctr.x;
			if (options.ctr.y)
				options.cy = options.ctr.y;
			if (options.ctr.dx)
				options.cx += options.ctr.dx;
			if (options.ctr.dy)
				options.cy += options.ctr.dy;
		}	
		if (options.scale) {
			options.scale.x = options.scale.x || 1;
			options.scale.y = options.scale.y || 1;
		}
		if (options.type==='round') {
				// add canvas for needle
			$(this.element).prepend('<canvas width="'+w+'" height="'+h+'"></canvas>');
				// copy css image needle to canvas image
			this._initNeedle();
			if (this.imgCtr) {
				options.imgCx = this.imgCtr.x;
				options.imgCy = this.imgCtr.y;
			}
		} else {
				// add div for vert and horiz needles
			$(this.element).prepend('<div class="'+myClass+'-ne"></div>');
		}
			
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiNeedle(wgtId, options));	
		
	},
	_init: function() {

	},	
	destroy: function() {
		this.element
			.removeClass( this.defClasses )
			.removeAttr( "role" );

		$.hmi.widget.prototype.destroy.call( this );
	},
	_setOption: function( key, value ) {
		$.hmi.widget.prototype._setOption.apply( this, arguments );
	},	
	
	_initNeedle: function () {
 
	    var elems = this.element[0].getElementsByTagName('canvas');
	    if (elems && elems.length>0) {
	    	var canvas = elems[0];
			if (canvas) {
		    		// needle images are stored as CSS bkgd images of a canvas element
			    	//  using CSS allows us to provide different themes for the needles in the future
			    	// (note: need to use jquery css to get true css during load time) 
			    var bkgdImgs = $(canvas).css('background-image').split(",");   	 
			    var bkgdPos = $(canvas).css('background-position').split(",");
			    if (bkgdPos.length>0)
			    	this.imgCtr = this._textToPt(bkgdPos[0]);
			    	
			   	$(canvas).css('background-image', "none");  	
			   	$(canvas).css('background-position', "none");  	
	
				$(canvas).prepend('<img src="'+this._cssUrlToFile(bkgdImgs[0])+'" />');
			}
		}	
	},

});

}( jQuery ) );
;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {


$.widget( "hmi.hmiKnob", $.hmi.hmiWidget, {

	options: {
		type: 'round'
	},
	defClasses: "hmi-wgt hmi-knob",
	imgCtr: null,
	
	_create: function() {
		var options = this.options;
		var self = this;
		var myClass="hmi-knob";
		
		if (options.type) {
			myClass += "-"+options.type;
			this.defClasses += " "+myClass;	
		}
			
		this.element
			.addClass( this.defClasses )
			.attr( "role", "knob" );
		
		var	jq = $(this.element),
			w = jq.width(),
			h = jq.height();
		
			// init the needle center point
		options.cx = w/2;
		options.cy = h/2;
		if (options.ctr) {		
			if (options.ctr.x)
				options.cx = options.ctr.x;
			if (options.ctr.y)
				options.cy = options.ctr.y;
			if (options.ctr.dx)
				options.cx += options.ctr.dx;
			if (options.ctr.dy)
				options.cy += options.ctr.dy;
		}	
		if (options.scale) {
			options.scale.x = options.scale.x || 1;
			options.scale.y = options.scale.y || 1;
		}
			// knob image size in CSS is based on 150 x 150
		options.viewScale = { x:w/150, y:h/150 };
			// add canvas for the thumb
		jq.prepend('<canvas width="'+w+'" height="'+h+'"></canvas>');
			// copy css image needle to canvas image
		this._initKnob(options, w, h);
		if (this.imgCtr) {
			options.imgCx = this.imgCtr.x;
			options.imgCy = this.imgCtr.y;
		}
		this.defaultOptions(options, this.element);
			
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiKnob(wgtId, options));	
		
	},
	_init: function() {

	},	
	_initKnob: function (options, w, h) {
		var urlToFile = function( text ) {
			var strFile;
			var idx1 = text.indexOf('(');
			if (idx1>=0) {
				var idx2 = text.indexOf(')', idx1);
				if (idx2>idx1) {
					strFile=text.substring(idx1+1, idx2);
						// remove quote characters (not sure why they are there but they are)
					strFile = strFile.replace(/\"/g,'');
					strFile = strFile.replace(/\'/g,'');
				}
			}
			return strFile;
		};	
	 
	    var elems = this.element[0].getElementsByTagName('canvas');
	    if (elems && elems.length>0) {
	    	var canvas = elems[0];
			if (canvas) {
				var jqCanv = $(canvas);
		    		// needle images are stored as CSS bkgd images of a canvas element
			    	//  using CSS allows us to provide different themes for the needles in the future
			    	// (note: need to use jquery css to get true css during load time) 
			    var bkgdImg = jqCanv.css('background-image');   	 
			    var strBkgdPos = jqCanv.css('background-position');
			    if (strBkgdPos)
			    	this.imgCtr = this._textToPt(strBkgdPos);
		    	
				jqCanv.css('background-image', "none");  	
				jqCanv.css('background-position', "none");  	
	
				jqCanv.prepend('<img src="'+urlToFile(bkgdImg)+'" />');
			}
		}	
	},
	_textToPt: function( text ) {
		var pt = { x:0, y:0 };
		var vals = text.split('px');
		if (vals.length>0)
			pt.x = parseFloat(vals[0]);
		if (vals.length>1)
			pt.y = parseFloat(vals[1]);
		return pt;	
	},		
});

}( jQuery ) );
;
/**
 * JMwidgets version 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {


$.widget( "hmi.hmiSlider", $.hmi.hmiWidget, {

	options: {
		type: 'horiz',
		min: 0,
		max: 100
	},
	defClasses: "hmi-wgt hmi-slider",
	
	_create: function() {
		var options = this.options;
		var self = this;
		var myClass="hmi-slider";
		
		if (options.type) {
			myClass += "-"+options.type;
		}
		if (options.style && (options.style!=="default")) 
			this.defClasses += " "+myClass+"-"+options.style;
		else
			this.defClasses += " "+myClass;
			
		this.element
			.addClass( this.defClasses )
			.attr( "role", "slider" );
		
		$(this.element).prepend('<div class="'+myClass+'-thmb"></div>');

			// adjust bkgd image width if we are using content box images
		var strBkOrigin = this.element.css('background-origin');
		if (strBkOrigin.indexOf('content-box')>0) {
			var strBkSize = this.element.css('background-size');
			if (options.type==='vert')
			 	strBkSize = this._calcBkSizeCSS( strBkSize, this.element.outerHeight(), 1 );
			else
			 	strBkSize = this._calcBkSizeCSS( strBkSize, this.element.outerWidth() );
			 	
			if (strBkSize)
				this.element.css('background-size', strBkSize);
		}
			
			// set background color
	    if (options.fill) 
	        this.element.css('background-color', options.fill);
				
		this.defaultOptions(options, this.element);

		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiSlider(wgtId, options));	
	},
	_init: function() {

	},	
	destroy: function() {
		this.element
			.removeClass( this.defClasses )
			.removeAttr( "role" );

		$.hmi.widget.prototype.destroy.call( this );
	},
	_setOption: function( key, value ) {
		$.hmi.widget.prototype._setOption.apply( this, arguments );

	},		
});

}( jQuery ) );
;
/**
 * JMwidgets
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
(function( $, undefined ) {


$.widget( "hmi.hmiAnalogClock", $.hmi.hmiWidget, {

	options: {
		shape: 'round'
	},
	
	_create: function() {
		var options = this.options;
		var self = this;
		var myClass = "hmi-analogclock";
		
		this.defClasses = "hmi-analogclock";
		if (options.style && options.shape)	
			this.defClasses += " hmi-analogclock-"+options.style;	
		else if (options.style)	
			this.defClasses += " hmi-analogclock-"+options.style+"-"+options.shape;	
		else if (options.shape)	
			this.defClasses += " hmi-analogclock-"+options.shape;	

				
		this.element
			.addClass( this.defClasses )
			.attr( "role", "analogclock" );	
					
		var	jq = $(this.element),
			w = jq.width(),
			h = jq.height(),
			strBkgdSize = 'background-size';
			bkgdImgSize = this._readBkgdSize(jq.css(strBkgdSize));		
		
		if (bkgdImgSize) {
			options.scale = {x:w/bkgdImgSize.w, y:h/bkgdImgSize.h};
			jq.css(strBkgdSize, "100%");
		} 
			// add canvas for needles
		$(this.element).prepend('<canvas width="'+w+'" height="'+h+'"></canvas>');
		
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiAnalogClock(wgtId, options));	
	},
	_init: function() {

	},	
	destroy: function() {
		this.element
			.removeClass( this.defClasses )
			.removeAttr( "role" );

		$.hmi.widget.prototype.destroy.call( this );
	},
	_readBkgdSize: function(strSize) {
		if (strSize) {
			var w=1,
				h=1;
				// extract widht and heigh from the background-size string
			var parts = strSize.split('px');
			if (parts.length>0) {
				w = parseInt(parts[0]);
				h = w;
			}
			if (parts.length>1) 
				h = parseInt(parts[1]);

			return {
				w: w,
				h: h
			};
		} else {
			return null;
		}
	},
	
});

}( jQuery ) );
;
/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, Inc. & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
(function( $, undefined ) {


$.widget( "hmi.hmiVariables", $.hmi.hmiWidget, {

	options: {
		text: null
	},


	_create: function() {
		var options = this.options;
		var self = this;
			
		this.element
			.attr( "role", "variables" )
			;
		var wgtId = this.hmiElem.id;
		this.initWidget(new hmiVariables(wgtId, options));	
	},
	
});

}( jQuery ) );
;
