import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

interface RoutingProps {
  source: [number, number];
  destination: [number, number];
}

export default function RoutingComponent({ source, destination }: RoutingProps) {
  const map = useMap();

  useEffect(() => {
    if (!source || !destination || !map) return;

    // @ts-ignore
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(source[0], source[1]),
        L.latLng(destination[0], destination[1])
      ],
      lineOptions: { 
        styles: [{ color: "#12308f", weight: 4 }], 
        extendToWaypoints: true, 
        missingRouteTolerance: 0 
      },
      show: false,
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      // @ts-ignore
      createMarker: () => null // Remove marcadores padrão (A e B)
    }).addTo(map);

    return () => {
        try {
            map.removeControl(routingControl);
        } catch(e) {
            console.error("Error removing routing control", e);
        }
    };
  }, [map, source, destination]);

  return null;
}
