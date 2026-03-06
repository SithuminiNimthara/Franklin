import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { LocateFixed } from 'lucide-react';

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
    const [isUserLocation, setIsUserLocation] = useState(false);

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
                        setIsUserLocation(true);
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
        setIsUserLocation(false);
        if (onLocationSelect) onLocationSelect(newPos);
    };

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const currentObj = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    setCenter(currentObj);
                    setMarkerPosition(currentObj);
                    setIsUserLocation(true);
                    if (onLocationSelect) onLocationSelect(currentObj);
                },
                (err) => {
                    alert("Location access denied or error. Please check your browser permissions.");
                    console.warn("Location access denied or error:", err);
                },
                { timeout: 10000 }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    if (!isLoaded) {
        return (
            <div className="w-full h-[300px] bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse flex items-center justify-center text-gray-400">
                Loading Google Maps...
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-[300px] rounded-2xl overflow-hidden">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={onMapClick}
                options={options}
            >
                {markerPosition && (
                    <Marker
                        position={markerPosition}
                        icon={isUserLocation ? {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#4285F4",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 2,
                        } : undefined}
                    />
                )}
            </GoogleMap>

            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLocateMe();
                }}
                className="absolute bottom-6 left-6 bg-white dark:bg-slate-800 p-3 rounded-full shadow-2xl border-2 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all z-10 hover:scale-110 active:scale-95"
                title="Find My Location"
            >
                <LocateFixed className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </button>
        </div>
    );
}
