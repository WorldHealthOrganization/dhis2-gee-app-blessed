import _ from "lodash";
import { D2Api, Id, DataValueSetsPostResponse } from "d2-api";
import { GeeDataEarthEngineRepository } from "../../data/GeeDataEarthEngineRepository";
import { GeeDataSetId, GeeInterval, GeeGeometry, GeeDataFilters } from "../../domain/repositories/GeeDataRepository";
import { GeeData, GeeDataItem } from "../../domain/entities/GeeData";

export interface OrgUnit {
    id: Id;
    featureType?: "NONE" | "MULTI_POLYGON" | "POLYGON" | "POINT" | "SYMBOL";
    coordinates?: string;
}

type DataElementId = string;
type OrgUnitId = string;

export interface DataValue {
    dataElement: Id;
    value: string;
    orgUnit: Id;
    period: string;
    attributeOptionCombo?: Id;
    categoryOptionCombo?: Id;
}

export interface DataValueSet {
    dataValues: DataValue[];
}

export interface GetDataValueSetOptions<Band extends string> {
    geeDataSetId: GeeDataSetId;
    mapping: Record<Band, DataElementId>;
    orgUnits: OrgUnit[];
    interval: GeeInterval;
    scale?: number;
}

export interface GetDataValuesOptions<Band extends string> {
    orgUnitId: string;
    geeData: GeeData<Band>;
    mapping: Record<Band, DataElementId>;
}

export class GeeDhis2 {
    constructor(public api: D2Api, public ee: GeeDataEarthEngineRepository) { }

    static init(api: D2Api, ee: GeeDataEarthEngineRepository) {
        return new GeeDhis2(api, ee);
    }

    async getDataValueSet<Band extends string>(
        options: GetDataValueSetOptions<Band>
    ): Promise<DataValueSet> {
        const { ee } = this;
        const { geeDataSetId, orgUnits, mapping, interval, scale } = options;
        const geometries = await this.getGeometries(orgUnits);
        console.log({ geometries });

        const dataValuesList = await promiseMap(_.toPairs(geometries), async ([ouId, geometry]) => {
            if (!geometry) return [];

            const options: GeeDataFilters<Band> = {
                id: geeDataSetId,
                bands: _.keys(mapping) as Band[],
                geometry,
                interval,
                scale,
            };

            const geeData = await ee.getData(options);
            return this.getDataValues({ orgUnitId: ouId, geeData, mapping });
        });

        return { dataValues: _.flatten(dataValuesList) };
    }

    async postDataValueSet(dataValueSet: DataValueSet): Promise<DataValueSetsPostResponse> {
        return this.api.dataValues.postSet({}, dataValueSet).getData();
    }

    private async getOrgUnitsWithGeometry(orgUnits: OrgUnit[]): Promise<OrgUnit[]> {
        const { api } = this;
        const [ousWithGeometry, ousWithoutGeometry] = _.partition(orgUnits, orgUnitHasGeometry);

        // d2-api supports 2.32 ou.geometry, not 2.30 ou.featureType/coordinates, do custom request
        const orgUnitIds = ousWithoutGeometry.map(ou => ou.id);
        const apiPath = [
            "/metadata?",
            "organisationUnits:fields=id,featureType,coordinates",
            "&",
            `organisationUnits:filter=id:in:[${orgUnitIds.join(",")}]`,
        ].join("");
        const { organisationUnits: organisationUnitsWithGeometryFromDb = [] } = await api
            .get<{ organisationUnits: OrgUnit[] | undefined }>(apiPath)
            .getData();

        return [...ousWithGeometry, ...organisationUnitsWithGeometryFromDb];
    }

    private async getGeometries(
        orgUnits: OrgUnit[]
    ): Promise<Record<OrgUnitId, GeeGeometry | undefined>> {
        const orgUnitsWithGeometry = await this.getOrgUnitsWithGeometry(orgUnits);
        const pairs = orgUnitsWithGeometry.map(orgUnit => {
            const geometry = getGeometryFromOrgUnit(orgUnit);
            return [orgUnit.id, geometry] as [OrgUnitId, GeeGeometry | undefined];
        });

        return _.fromPairs(pairs);
    }

    private getDataValues<Band extends string>(options: GetDataValuesOptions<Band>): DataValue[] {
        const { orgUnitId, geeData, mapping } = options;

        function getDataValue(item: GeeDataItem<Band>): DataValue | undefined {
            const { date, band, value } = item;
            const dataElementId = get(mapping, band);

            if (!dataElementId) {
                console.error(`Band not found in mapping: ${band}`);
                return;
            } else {
                return {
                    dataElement: dataElementId,
                    value: value.toFixed(18),
                    orgUnit: orgUnitId,
                    period: date.format("YYYYMMDD"), // Assume periodType="DAILY"
                };
            }
        }

        return _(geeData).map(getDataValue).compact().value();
    }
}

function get<K extends keyof T, T>(obj: T, key: K): T[K] | undefined {
    return obj[key];
}

function getGeometryFromOrgUnit(orgUnit: OrgUnit): GeeGeometry | undefined {
    const coordinates = orgUnit.coordinates ? JSON.parse(orgUnit.coordinates) : null;
    if (!coordinates) return;

    switch (orgUnit.featureType) {
        case "POINT":
            return { type: "point", coordinates };
        case "POLYGON":
        case "MULTI_POLYGON":
            return { type: "multi-polygon", polygonCoordinates: coordinates };
        default:
            return;
    }
}

function orgUnitHasGeometry(orgUnit: OrgUnit) {
    return orgUnit.featureType === "NONE" || orgUnit.coordinates;
}

/* Map sequentially over T[] with an async function and return array of mapped values */
export function promiseMap<T, S>(inputValues: T[], mapper: (value: T) => Promise<S>): Promise<S[]> {
    const reducer = (acc$: Promise<S[]>, inputValue: T): Promise<S[]> =>
        acc$.then((acc: S[]) =>
            mapper(inputValue).then(result => {
                acc.push(result);
                return acc;
            })
        );
    return inputValues.reduce(reducer, Promise.resolve([]));
}
