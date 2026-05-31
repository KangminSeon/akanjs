"use client";
import { lazy } from "akanjs/webkit";
import { useEffect, useState } from "react";

const ReactGlobe = lazy(() => import("react-globe.gl"), { ssr: false });
// import ReactGlobe from "react-globe.gl";
export default function Globe() {
  const [countries, setCountries] = useState({ features: [] });
  useEffect(() => {
    void fetch("/globe-data.json")
      .then((data) => data.json())
      .then(setCountries);
  }, []);

  const N = 20;
  const arcsData = [...Array(N).keys()].map(() => ({
    startLat: (Math.random() - 0.5) * 180,
    startLng: (Math.random() - 0.5) * 360,
    endLat: (Math.random() - 0.5) * 180,
    endLng: (Math.random() - 0.5) * 360,
    color: [
      ["red", "white", "blue", "green"][Math.round(Math.random() * 3)],
      ["red", "white", "blue", "green"][Math.round(Math.random() * 3)],
    ],
  }));
  return (
    <ReactGlobe
      // globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
      hexPolygonsData={countries.features}
      hexPolygonResolution={3}
      hexPolygonMargin={0.7}
      showAtmosphere
      atmosphereColor="#38fbdb"
      atmosphereAltitude={0.25}
      hexPolygonColor={
        () => "#38fbdb" //"rgba(255,255,255, 0.7)"
        // `#${Math.round(Math.random() * Math.pow(2, 24))
        //   .toString(16)
        //   .padStart(6, "0")}`
      }
      hexPolygonLabel={({ properties: d }: any) => `
        <b>${d.ADMIN} (${d.ISO_A2})</b> <br />
        Population: <i>${d.POP_EST}</i>
      `}
      arcsData={arcsData}
      arcColor={"color"}
      arcDashLength={() => Math.random()}
      arcDashGap={() => Math.random()}
      arcDashAnimateTime={() => Math.random() * 4000 + 500}
    />
  );
}
