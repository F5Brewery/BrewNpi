/**
 * JMwidgets 
 * Copyright (c) 2012, Exor International, SpA & BitMethods, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.jmwidgets.com
 */
 
function hmiString( wgtId, options, parentPage ) {
    // do nothing for default constructor
    if (!wgtId) return;

    this.rw = 'r';
    this.format = "#";
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
hmiString.prototype = new hmiWidget();
/**
 * Initializing the widget with the provided properties
 * @param {Object} props The properties of the widget
 */
hmiString.prototype.setOptions = function ( props ) {
    if ( props != null ) {
        for ( var item in props ) {
            this[item] = props[item];
        }
        //Even if there is no tag associated with the widget make sure that the current innerHTML value of the widget
        //Div element formatted properly based on the format property
        var val = $( this.elem ).html();
        if ( $.trim( val ) !== '' ) {
            if ( this.value === null ) {
                this.value = val; //Storing the initial value, which can come handy if the widget is not attached to any tag
            }
            if ( !this.masked ) {
                var newVal = val;
                this.elem.innerHTML = newVal;
            } else {
                this.setMaskedValue( val );
            }
        }
    }

};
/**
 * Function that handles the event attachments on String widgets for making the dynamic data insertion possible
 */
hmiString.prototype.attachKeypadEvents = function () {
    if ( this.rw === 'w' || this.rw === 'rw' ) {
        var me = this;
        $( this.elem ).click( function () {
            me.showKeyPad();
        } );
    }
};

hmiString.prototype.resizeHdlrForKpd = function () {
    var offset = $( '#' + $( '#kpd' ).data( 'wgtId' ) ).offset();
    document.getElementById( 'kpd' ).style.left = offset.left + 'px';
    document.getElementById( 'kpd' ).style.top = offset.top + 'px';
};
/**
 * Function that shows the dialog box for inserting data
 */
hmiString.prototype.showKeyPad = function () {
    var me = this;
    var wgtId = this.wgtId;
    if ( document.getElementById( 'kpd' ) ) {
        //Seems that the keypad dialog is visible
        return false;
    }
    //New element insertion into DOM
    var sHtml = '<div id="kpd"><input name="nField" id="nField" value="" autocapitalize="off"><br><button type="button" class="positive" name="save" id="save"><div class="img saveimg"></div></button><button type="button" class="negative" name="discard" id="discard"><div class="img canceling"></div></button></div>';
    var $newdiv1 = $( sHtml );
    $( 'body' ).append( $newdiv1 );
    //Position the container
    var keypad = document.getElementById( 'kpd' );
    $( '#kpd' ).data( 'wgtId', this.elem.id );
    var offset = $( this.elem ).offset();
    keypad.style.left = offset.left + 'px';
    keypad.style.top = offset.top + 'px';
    //Style the text box based on the String widget on which it is going to work
    var nFields = keypad.getElementsByTagName( 'input' );
    if ( nFields.length > 0 ) {
        var nField = nFields[0];
        //use jquery so we get the computed style
        if ( nField ) {
            var el = $( this.elem );
            nField.style.width = el.css( 'width' );
            nField.style.height = el.css( 'height' );
            nField.style.color = '#383838';
            nField.style.backgroundColor = '#dfdfde';
            nField.style.font = el.css( 'font' );
            nField.style.fontSize = el.css( 'font-size' );
            nField.style.textAlign = el.css( 'textAlign' );
            nField.value = $hmi( wgtId ).getValue( 'value' );
            //Focus on the textbox
            nField.focus();
            nField.setSelectionRange( 0, 9999 );
        }
    }
    //ok button click event attachments
    $( '#kpd #save' ).click( function () {
        var newVal = $( '#nField' ).val(); //Get the value from the field
        newVal = $.trim( newVal );
        var decimalRegex = /^\-?[0-9]*\.?[0-9]+$/ //Decimal regular expression for checking the value
        me.setValue("value", newVal);
	// need to update tags attached to widget
	me.doWriteValue('value', me.value);			
        me.hideKeyPad(); //Destroy the dialog
    } );
    //cancel button click event attachments
    $( '#kpd #discard' ).click( function () {
        me.hideKeyPad();
        $( window ).unbind( 'resize', me.resizeHdlrForKpd );
    } );
    //keyup event handler for the text box
    $( '#kpd #nField' ).keyup( function ( e ) {
        if ( e.keyCode === 13 ) {
            $( '#save' ).click();
        } else if (e.keyCode === 27) {	// escape key
        	$('#discard').click();       	
        }
    } );

    $( window ).unbind( 'resize', this.resizeHdlrForKpd );
    $( window ).bind( 'resize', this.resizeHdlrForKpd );
};
/**
 * Function that destroys the keypad dialog
 */
hmiString.prototype.hideKeyPad = function () {
    $( window ).unbind( 'resize', this.resizeHdlrForKpd );
    $( '#kpd' ).remove();
};
/**
 * Setting the masked value of the String widget
 * @param {String} val The mask widget value
 */
hmiString.prototype.setMaskedValue = function (val) {
    var len = this.formatText(val).toString().length,
        msk = '';
    for (var i = 0; i < len; i++) {
        msk += this.maskChar;
    }
    if (this.elem) {
        this.elem.innerHTML = msk;
    }
};
/**
 * Setting the value of the String widget
 * @param {String} tag The tag name
 * @param {Text} newValue The widget value
 */
hmiString.prototype.setValue = function ( tag, newValue ) {
    if (this.elem != null) {
        if ( tag == "value" ) {
            newValue = newValue;
            //min and max properties comes into play only  if studio has generated the min and max property - Commented on 23-02-2012
            /*if (this.min !== null && this.max !== null) {
             newValue = (newValue <= this.min ? this.min : (newValue >= this.max ? this.max : newValue));
             }*/
            if ( this.value != newValue ) {
                this.value = newValue;

                if ( !this.masked ) {
                    this.elem.innerHTML = this.formatText( newValue );
                } else {
                    this.setMaskedValue( this.formatText( newValue ) );
                }
            }
            // update any other widgets that are attached to us
            this.sendUpdate( tag, this.value );
        } else {
            hmiWidget.prototype.setValue.call( this, tag, newValue );
        }
    }
};
/**
 * Function to get the value of the Widget
 * @param {String} tag tag name will be the property name
 */
hmiString.prototype.getValue = function ( tag ) {
    if ( tag == "value" ) {
        return this.value;
    } else {
        return hmiWidget.prototype.getValue.call( this, tag );
    }
};
/**
 * Applies the string format of the String widget
 * @param {String} newValue A string representing the format of a string
 * @return {String} formatted text
 */
hmiString.prototype.formatText = function ( newValue ) {
    var strValue;
    strValue = newValue;
    return strValue;
};
$hmi.fn.hmiString = function ( options, parentPage ) {
    return new hmiString( this.wgtId, options, parentPage );
};
