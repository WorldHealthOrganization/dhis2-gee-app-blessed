import { Moment } from "moment";
import { GeeData } from "../entities/GeeData";

export type GeeGeometry =
    | { type: "point"; coordinates: GeeCoordinates }
    | { type: "multi-polygon"; polygonCoordinates: GeeCoordinates[][][] };

export type GeeDataSetId = string;
export type GeeCoordinates = [number, number];
export type GeeInterval = { type: "daily"; start: Moment; end: Moment };

export interface GeeDataFilters<Band> {
    id: GeeDataSetId;
    bands: Band[];
    geometry: GeeGeometry;
    interval: GeeInterval;
    scale?: number;
}

export interface GeeDataRepository {
    getData<Band extends string>(options: GeeDataFilters<Band>): Promise<GeeData<Band>>
} 