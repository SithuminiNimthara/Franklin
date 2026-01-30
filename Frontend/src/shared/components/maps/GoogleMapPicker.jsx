import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '300px',
    borderRadius: '1rem'
};

const defaultCenter = {
    lat: 6.0535, // Galle, Sri Lanka (approximate coastal turtle area)
    lng: 80.2210
};

const options = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
};

export default function GoogleMapPicker({ onLocationSelect, initialLocation }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    });

    const [map, setMap] = useState(null);
    const [center, setCenter] = useState(defaultCenter);
    const [markerPosition, setMarkerPosition] = useState(initialLocation || null);

    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map) {
        setMap(null);
    }, []);

    useEffect(() => {
        // If we have an initial location, use it. Otherwise try to get current location.
        if (initialLocation) {
            setCenter(initialLocation);
            setMarkerPosition(initialLocation);
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const currentObj = {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude
                        };
                        setCenter(currentObj); // Move map to user
                        // Optional: Don't auto-select user location unless requested?
                        // The user said "user should enter the his current location", so maybe auto-selecting is good helper.
                        setMarkerPosition(currentObj);
                        if (onLocationSelect) onLocationSelect(currentObj);
                    },
                    (err) => {
                        console.warn("Location access denied or error:", err);
                    },
                    { timeout: 10000 }
                );
            }
        }
    }, []); // Run once on mount

    const onMapClick = (e) => {
        const newPos = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
        };
        setMarkerPosition(newPos);
        if (onLocationSelect) onLocationSelect(newPos);
    };

    if (!isLoaded) {
        return (
            <div className="w-full h-[300px] bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse flex items-center justify-center text-gray-400">
                Loading Google Maps...
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={14}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={onMapClick}
            options={options}
        >
            {markerPosition && <Marker position={markerPosition} />}
        </GoogleMap>
    );
}
