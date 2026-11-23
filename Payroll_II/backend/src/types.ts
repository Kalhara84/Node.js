export interface Department {
    depsno: number;
    depdep: string;
    depdes: string | null;
}
export interface Location {
    locsno: number;
    locloc: string;
    locnam: string | null;
}
export interface SysItem {
    syssno: number;
    sysrtp: number;
    sysrno: string;
    sysdes: string;
}
export interface Lookups {
    locations: Location[];
    departments: Department[];
    sections: SysItem[];
    costCenters: SysItem[];
    basis: SysItem[];
    areas: SysItem[];
}
export interface Employee {
    empsno: number;
    empeno: number;
    empinital: string;
    empnam: string;
    empcat: string;
    empactflg: string;
    empsts: string;
    empmapcode: number | null;
    emplocsno: number | null;
    empdepsno: number | null;
    empsecsno: number | null;
    emparesno: number | null;
    empcossno: number | null;
    empbasisno: number | null;
    department_name?: string | null;
    location_name?: string | null;
    empsal: number;
    empscgpcn: number;
    empepfyn: string;
    empepfno: number;
    emppayeyn: string;
    emptno: number;
    empprl: number;
    emptax: number;
    empgin: number;
    emptin: string;
    empcob: number;
    empmof: string;
    empidno: string;
    emppasportno: string;
    empdob: string | null;
    empmrdtst: string;
    empdesig: string;
    empjoin: string | null;
    empleft: string | null;
    empbnkacno: string;
    empbnkcode: string;
    empbnkbranch: string;
    empbnkid: string;
    empad1: string;
    empad2: string;
    empad3: string;
    empad4: string;
    empemail: string;
    emptel: string;
    empanual: string;
    empcasal: string;
    empleuleu: string;
    empotflg: string;
    empnopflg: string;
    empattincflg: string;
    emplateflg: string;
    empnsatlflg: string;
}
export interface Paged<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface AuthUser {
    id: number;
    username: string;
    name: string;
    role: string;
}
/** what we store inside the login token */
export interface TokenPayload {
    sub: number;
    usr: string;
    name: string;
    exp: number;
}
export interface ChartItem {
    label: string | number;
    value: number;
}
export interface DashboardData {
    totals: {
        total: number;
        active: number;
        inactive: number;
        payroll: number;
        avgSalary: number;
        joinedThisYear: number;
    };
    byCategory: ChartItem[];
    byGender: ChartItem[];
    byDepartment: ChartItem[];
    byLocation: ChartItem[];
    payrollByDepartment: ChartItem[];
    joinsByYear: ChartItem[];
    recent: {
        empsno: number;
        empeno: number;
        empnam: string;
        empdesig: string;
        department_name: string | null;
        empjoin: string | null;
    }[];
}
/** employee fields that can be sent when creating / updating */
export type EmployeeInput = Partial<Omit<Employee, 'empsno' | 'department_name' | 'location_name'>>;
export interface UserRow {
    usdsno: number;
    usdusd: string;
    usdpwd: string;
    usdnam: string | null;
    usddes: string | null;
    usdactive: string;
}
