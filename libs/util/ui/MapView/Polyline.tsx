"use client";
import { cnst } from "@libs/util/client";
import { PolylineF } from "@react-google-maps/api";

interface PolylineProps {
  coordinates: cnst.Coordinate[];
  options?: google.maps.PolylineOptions;
  onClick?: (coordinate: cnst.Coordinate) => void;
}
export default function Polyline({
  coordinates,
  options = { strokeColor: "#ffffff", strokeWeight: 1, strokeOpacity: 0.5 },
  onClick,
}: PolylineProps) {
  const latLngs = coordinates.map((coordinate) => ({ lat: coordinate.coordinates[1], lng: coordinate.coordinates[0] }));
  return (
    <PolylineF
      onClick={(e) => {
        if (!options.clickable || !e.latLng) return;
        const coordinate = new cnst.Coordinate().set({ coordinates: [e.latLng.lng(), e.latLng.lat()], altitude: 0 });
        onClick?.(coordinate);
      }}
      options={options}
      path={latLngs}
    />
  );
}
