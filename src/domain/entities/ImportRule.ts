import { Id } from "./Ref";
import { PeriodOption } from "./PeriodOption";

export const importRuleDefaultId = "default";

export interface ImportRuleData {
    id: Id;
    name: string;
    code?: string;
    description?: string;
    selectedOUs: string[];
    periodInformation: PeriodOption;
    selectedMappings: string[];
    created: Date;
    lastUpdated: Date;
    lastExecuted?: Date;
}

export class ImportRule {
    public readonly id: Id;
    public readonly name: string;
    public readonly code?: string;
    public readonly description?: string;
    public readonly selectedOUs: string[];
    public readonly periodInformation: PeriodOption;
    public readonly selectedMappings: string[];
    public readonly created: Date;
    public readonly lastUpdated: Date;
    public readonly lastExecuted?: Date;

    constructor(private data: ImportRuleData) {
        this.id = data.id;
        this.name = data.name;
        this.code = data.code;
        this.description = data.description;
        this.selectedOUs = data.selectedOUs;
        this.periodInformation = data.periodInformation;
        this.selectedMappings = data.selectedMappings;
        this.created = data.created;
        this.lastUpdated = data.lastUpdated;
        this.lastExecuted = data.lastExecuted;
    }

    public get isDefault(): boolean {
        return this.id === importRuleDefaultId;
    }

    public changeMappings(selectedMappings: string[]) {
        const newData = { ...this.data, selectedMappings: selectedMappings };
        return new ImportRule(newData);
    }

    public changeOUs(selectedOUs: string[]) {
        const newData = { ...this.data, selectedOUs: selectedOUs };
        return new ImportRule(newData);
    }

    public changePeriod(period: PeriodOption) {
        const newData = { ...this.data, periodInformation: period };
        return new ImportRule(newData);
    }

    public updateLastExecuted() {
        const newData = { ...this.data, lastExecuted: new Date() };
        return new ImportRule(newData);
    }
}
