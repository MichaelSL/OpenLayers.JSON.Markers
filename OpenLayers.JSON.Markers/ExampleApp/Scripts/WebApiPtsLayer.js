/* Michael Samorokov © 2013. Based on OpenLayers source code.
 * Published under the Clear BSD license.
 * See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. */

/**
 * @requires OpenLayers/Layer/Markers.js
 * @requires OpenLayers/Request/XMLHttpRequest.js
 */

OpenLayers.Layer.WebApiPts = OpenLayers.Class(OpenLayers.Layer.Markers, {

    /**
     * APIProperty: location
     * {String} URL of an action.  Must be specified in the "options" argument
     *   of the constructor. Can not be changed once passed in.
     */
    location: null,

    /**
     * Property: features
     * {Array(<OpenLayers.Feature>)}
     */
    features: null,

    /**
     * APIProperty: formatOptions
     * {Object} Hash of options which should be passed to the format when it is
     * created. Must be passed in the constructor.
     */
    formatOptions: null,

    /**
     * Property: selectedFeature
     * {<OpenLayers.Feature>}
     */
    selectedFeature: null,

    /**
     * Property: pointsCount
     * {Number} Number of loaded points
     */
    pointsCount: 0,

    minTime: null,

    maxTime: null,

    getTitleCallback: null,
    getDescriptionCallback: null,

    iconSize: null,
    iconOffset: null,
    markerImgSource: null,

    /**
     * Constructor: OpenLayers.Layer.WebApiPts
     * Create a text layer.
     *
     * Parameters:
     * name - {String}
     * options - {Object} Object with properties to be set on the layer.
     *     Must include <location> property.
     */
    initialize: function (name, options) {
        OpenLayers.Layer.Markers.prototype.initialize.apply(this, arguments);
        this.features = new Array();
    },

    /**
     * APIMethod: destroy
     */
    destroy: function () {
        // Warning: Layer.Markers.destroy() must be called prior to calling
        // clearFeatures() here, otherwise we leak memory. Indeed, if
        // Layer.Markers.destroy() is called after clearFeatures(), it won't be
        // able to remove the marker image elements from the layer's div since
        // the markers will have been destroyed by clearFeatures().
        OpenLayers.Layer.Markers.prototype.destroy.apply(this, arguments);
        this.clearFeatures();
        this.features = null;
    },

    /**
     * Method: loadText
     * Start the load of the Text data. Don't do this when we first add the layer,
     * since we may not be visible at any point, and it would therefore be a waste.
     */
    loadText: function () {
        if (!this.loaded) {
            if (this.location != null) {

                var onFail = function (e) {
                    this.events.triggerEvent("loadend");
                };

                this.events.triggerEvent("loadstart");
                OpenLayers.Request.GET({
                    url: this.location,
                    success: this.parseData,
                    failure: onFail,
                    scope: this
                });
                this.loaded = true;
            }
        }
    },

    /**
     * Method: moveTo
     * If layer is visible and Text has not been loaded, load Text.
     *
     * Parameters:
     * bounds - {Object}
     * zoomChanged - {Object}
     * minor - {Object}
     */
    moveTo: function (bounds, zoomChanged, minor) {
        OpenLayers.Layer.Markers.prototype.moveTo.apply(this, arguments);
        if (this.visibility && !this.loaded) {
            this.loadText();
        }
    },

    /**
     * Method: parseData
     *
     * Parameters:
     * ajaxRequest - {<OpenLayers.Request.XMLHttpRequest>}
     */
    parseData: function (ajaxRequest) {
        var text = ajaxRequest.responseText;

        var data = $.parseJSON(text);

        this.pointsCount = data.length;
        if (data.length > 0) {
            this.minTime = data[0].timestamp;
            this.maxTime = data[data.length - 1].timestamp;
        }

        var options = {};

        OpenLayers.Util.extend(options, this.formatOptions);

        if (this.map && !this.projection.equals(this.map.getProjectionObject())) {
            options.externalProjection = this.projection;
            options.internalProjection = this.map.getProjectionObject();
        }

        for (var i = 0; i < data.length; i++) {
            var balloonData = {};
            var location;
            var iconSize, iconOffset, imgSource;

            location = new OpenLayers.LonLat(data[i].lon,
                                             data[i].lat).transform(this.projection, this.map.getProjectionObject());

            if (this.iconSize != null)
                icon = this.iconSize;
            if (this.iconOffset != null)
                iconOffset = this.iconOffset;
            if (this.markerImgSource != null)
                imgSource = this.markerImgSource;

            if (data[i].style != undefined) {
                if (data[i].style.graphicWidth
                    && data[i].style.graphicHeight) {
                    iconSize = new OpenLayers.Size(
                        data[i].style.graphicWidth,
                        data[i].style.graphicHeight);
                }

                if (data[i].style.graphicXOffset !== undefined
                    && data[i].style.graphicYOffset !== undefined) {
                    iconOffset = new OpenLayers.Pixel(
                        data[i].style.graphicXOffset,
                        data[i].style.graphicYOffset);
                }

                if (data[i].style.externalGraphic != null) {
                    balloonData.icon = new OpenLayers.Icon(data[i].style.externalGraphic,
                                                    iconSize,
                                                    iconOffset);
                }
            } else {
                if (iconSize != null && iconOffset != null && imgSource != null) {
                    balloonData.icon = new OpenLayers.Icon(imgSource,
                                                    iconSize,
                                                    iconOffset);
                } else
                    balloonData.icon = OpenLayers.Marker.defaultIcon();
            }

            if ((this.getTitleCallback != null)
                && (this.getDescriptionCallback != null)) {
                balloonData['popupContentHTML'] =
                    '<h2>' + this.getTitleCallback(data[i]) + '</h2>' +
                    '<p>' + this.getDescriptionCallback(data[i]) + '</p>';
            }

            balloonData['overflow'] = "auto";

            var markerFeature = new OpenLayers.Feature(this, location, balloonData);
            this.features.push(markerFeature);
            var marker = markerFeature.createMarker();
            if ((this.getTitleCallback != null)
                && (this.getDescriptionCallback != null)) {
                marker.events.register('click', markerFeature, this.markerClick);
            }
            this.addMarker(marker);
        }
        this.events.triggerEvent("loadend");
    },

    /**
     * Property: markerClick
     *
     * Parameters:
     * evt - {Event}
     */
    markerClick: function (evt) {
        var sameMarkerClicked = (this == this.layer.selectedFeature);
        this.layer.selectedFeature = (!sameMarkerClicked) ? this : null;
        for (var i = 0, len = this.layer.map.popups.length; i < len; i++) {
            this.layer.map.removePopup(this.layer.map.popups[i]);
        }
        if (!sameMarkerClicked) {
            this.layer.map.addPopup(this.createPopup());
        }
        OpenLayers.Event.stop(evt);
    },

    /**
     * Method: clearFeatures
     */
    clearFeatures: function () {
        if (this.features != null) {
            while (this.features.length > 0) {
                var feature = this.features[0];
                OpenLayers.Util.removeItem(this.features, feature);
                feature.destroy();
            }
        }
    },

    CLASS_NAME: "OpenLayers.Layer.WebApiPts"
});