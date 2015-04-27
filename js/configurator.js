/*
	KII Keyboard Editor
	Copyright (C) 2015 Matteo Spinelli

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var APP = APP || {};

(function (window, document) {

// main application instance
var _instance;

// singleton
function APP (debug) {
	_instance = _instance || new APP.Class(debug);

	return _instance;
}

APP.VERSION = '0.1';
APP.GENERATOR = 'KIICONF';

APP.GRID_SIZE = 13;
APP.KEY_SIZE = APP.GRID_SIZE * 4;
APP.STAGE_WIDTH = 0;	// they will be populated later
APP.STAGE_HEIGHT = 0;

APP.Class = function (debug) {
	var that = this;

	this.header = {};
	this.matrix = [];

	this._selectedLayer = 0;

	this.$stage = $('#stage');
	this.$document = $(document);

	APP.STAGE_WIDTH = Math.floor(this.$stage.width() / APP.GRID_SIZE);
	APP.STAGE_HEIGHT = Math.floor(this.$stage.height() / APP.GRID_SIZE);

	// create shortcuts
	var $shortcuts = $('#shortcuts');
	var $shortcutsGroup;
	var group = '';
	$.each( APP.keyDefaults, function (k, v) {
		if ( 'group' in v ) {

			if ( group != v.group ) {
				$shortcutsGroup = $('#group-' + v.group).length ? $('#group-' + v.group) : $('<div id="group-' + v.group + '" class="group"></div>').appendTo($shortcuts);
				group = v.group;
			}

			$shortcutsGroup.append('<span class="shortcut-button" data-key="' + k + '">' + ( v.label || k ) + '</span>');
		}
	});

	$shortcuts.on('click', $.proxy(this.shortcut, this) );

	// load button
	$('#load-layout')
		.on('click', $.proxy(this.loadLayout, this, ''));

	// tab switch
	$('#layers li').on('click', function (e) {
		e.stopPropagation();
		that.layerSelect.call(that, this);
	});

	// display layers
	$('#layers input').on('click', function (e) {
		e.stopPropagation();
		that.displayLayers.call(that, this);
	});

	// deselect keys
	this.$document
		.on('keydown', $.proxy(this.keyPressed, this))
		.on('click', $.proxy(this.deselectKeys, this));

	this.displayLayers();

	if ( debug ) {
		this.loadLayout( $("#layout-list option:eq(1)").val() );
	}
};

APP.Class.prototype = {
	loadLayout: function (file) {
		this.clearLayout();

		file = file || $('#layout-list').val();

		if ( ! file ) {
			alert('Select a layout first!');
			return;
		}

		$.get('layouts/' + file + '.json', $.proxy(this.buildLayout, this) );
	},

	buildLayout: function (layout) {
		this.header = layout.header;

		var matrix = layout.matrix;
		var key;
		var minX = Infinity;
		var minY = Infinity;
		var maxX = 0;
		var maxY = 0;

		for ( var i = matrix.length; i--; ) {
			minX = Math.min(minX, matrix[i].x);
			minY = Math.min(minY, matrix[i].y);
			maxX = Math.max(maxX, matrix[i].x + matrix[i].w);
			maxY = Math.max(maxY, matrix[i].y + matrix[i].h);

			this.matrix.push( new APP.Key(this.$stage, {
				readonly: true,

				code: matrix[i].code,
				x: matrix[i].x,
				y: matrix[i].y,
				w: matrix[i].w,
				h: matrix[i].h,
				layers: matrix[i].layers
			}) );
		}

		this.$stage.css({
			top: -minY * APP.GRID_SIZE + 20 + 'px',
			left: -minX * APP.GRID_SIZE + 20 + 'px'
		});

		$('#container').css({
			marginTop: '0',
			width: (maxX - minX) * APP.GRID_SIZE + 40 + 'px',
			height: (maxY - minY) * APP.GRID_SIZE + 40 + 'px'
		});

		$('#shortcuts').show();
	},

	selectKey: function (key) {
		this._selectedKey = key;
	},

	keyPressed: function (e) {
		if ( !this._selectedKey ) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();	// don't think this is needed

		if( !$('#layer-check-' + this._selectedLayer).is(':checked') ) {
			alert('The current layer is not visibile. Activate it before making changes to the layout.');
			return;
		}

		// try to find out if we pressed left or right shift/ctrl/alt/...
		if ( e.originalEvent.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT ) {
			e.which += 1000;
		} else if ( e.originalEvent.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT ) {
			e.which += 2000;
		} else if ( e.originalEvent.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
			e.which += 3000;
		}

		if ( !(e.which in APP.keyCodes) ) {
			return;
		}

		this._selectedKey.setKey( APP.keyCodes[e.which], this._selectedLayer );
	},

	deselectKeys: function (e) {
		if ( !this._selectedKey ) {
			return;
		}

		this._selectedKey.$element.removeClass('selected');
		this._selectedKey = '';
	},

	shortcut: function (e) {
		if ( !this._selectedKey ) {
			return;
		}

		e.stopPropagation();

		if( !$('#layer-check-' + this._selectedLayer).is(':checked') ) {
			alert('The current layer is not visibile. Activate it before making changes to the layout.');
			return;
		}

		var data = $(e.target).closest('.shortcut-button').data('key');

		if ( !data ) {
			return;
		}

		this._selectedKey.setKey(data, this._selectedLayer);
	},

	layerSelect: function (el, e) {
		$el = $(el);

		$('#layers .selected').removeClass('selected');
		$el.addClass('selected');
		$('#container').css({
			backgroundColor: $(el).css('backgroundColor')
		});

		this._selectedLayer = $el.find('input').attr('value');
	},

	displayLayers: function () {
		$('#container').removeClass('layer-0 layer-1 layer-2 layer-3 layer-4 layer-5 layer-6 layer-7');
		$('#layers input:checked').each(function () {
			$('#container').addClass('layer-' + this.value);
		});
	},

	clearLayout: function () {
		this.header = {};
		this.matrix = [];

		// following jQuery documentation all event listeners are automatically removed so this is all we need to clear the board
		// TODO: check memory leaks
		this.$stage.find('.key').remove();
	}
};

window.APP = APP;

})(window, document);