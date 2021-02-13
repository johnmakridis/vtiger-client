import axios from 'axios';
import md5 from 'crypto-js/md5';
import { VtigerModule, VtigerResponse } from './types';



class VtigerApiClient {
    /**
     * session Id
     *
     * @private
     * @type {string}
     * @memberof VtigerApiClient
     */
    private sessionId: string;
    public user: any;
    public userId: string;
    public webserviceUrl: string;


    /**
    *Creates an instance of VtigerClient.
    * @param {string} url The URL for vtigercrm
    * @param {string} username Your vtigercrm username
    * @param {string} accessKey Your user accessKey (defined in user preferences page)
    */
    constructor(
        private url: string,
        private username: string,
        private accessKey: string) {

        this.sessionId = null;
        this.user = null;
        this.userId = null;
        this.webserviceUrl = `${this.url}/webservice.php`;


    }


    /**
     * Create a Vtigercrm API session. Required to perform all the Vtiger Webservice operations
     *
     * @returns {Promise<VtigerResponse>}
     * @memberof VtigerClient
     */
    async login(): Promise<VtigerResponse> {

        try {

            const challengeResponse = await this.getChallenge();
            const challengeToken = challengeResponse.result.token;

            const hash = md5(challengeToken + this.accessKey).toString();

            const vtigerLoginParams = new URLSearchParams();
            vtigerLoginParams.append('operation', 'login');
            vtigerLoginParams.append('username', this.username);
            vtigerLoginParams.append('accessKey', hash);

            const vtigerLoginConfig = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            const vtigerLoginResponse = await axios.post(this.webserviceUrl,
                vtigerLoginParams,
                vtigerLoginConfig
            );

            this.sessionId = vtigerLoginResponse.data.result.sessionName;
            this.userId = vtigerLoginResponse.data.result.userId;
            this.user = vtigerLoginResponse.data.result;

            console.log(`VtigerApiClient: Logged in as ${this.username}`);

            return Promise.resolve(vtigerLoginResponse.data);

        } catch (error) {
            return Promise.reject(error.message || error);
        }

    }



    /**
     * Get the Challenge Token, required to perform login and create the session.
     *
     * @private
     * @returns {Promise<VtigerResponse>}
     * @memberof VtigerClient
     */
    private async getChallenge(): Promise<VtigerResponse> {
        try {

            const vtigerChallengeResponse = await axios.get(this.webserviceUrl, {
                params: {
                    operation: 'getchallenge',
                    username: this.username
                }
            });


            if (!vtigerChallengeResponse.data.success)
                throw new Error(vtigerChallengeResponse.data.error?.message || 'Operation failed: getchallenge');

            return Promise.resolve(vtigerChallengeResponse.data);

        } catch (error) {
            return Promise.reject(error);
        }
    }



    /**
     * Create single entity record. 
     * You are expected to send all the mandatory field value along with optional field for successful record creation. 
     * Use describe() method to know more about the field mandatory configuration.
     *
     * @param {VtigerModule} module
     * @param {*} data
     * @returns {Promise<VtigerResponse>}
     */
    async create(module: VtigerModule, data: any): Promise<VtigerResponse> {

        try {

            const moduleName = this.getModuleName(module);

            data.assigned_user_id = data.assigned_user_id || this.userId;

            const params = new URLSearchParams();
            params.append('operation', 'create');
            params.append('sessionName', this.sessionId);
            params.append('element', JSON.stringify(data));
            params.append('elementType', moduleName);

            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            const response = await axios.post(this.webserviceUrl, params, config)

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Get specific record information.
     *
     * @param {VtigerModule} module
     * @param {number} recordId
     * @returns {Promise<VtigerResponse>}
     */
    async retrieve(module: VtigerModule, recordId: number): Promise<VtigerResponse> {

        try {

            const moduleId = this.getModuleId(module);

            const response = await axios.get(this.webserviceUrl, {
                params: {
                    operation: 'retrieve',
                    sessionName: this.sessionId,
                    id: `${moduleId}x${recordId}`
                }
            });

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Update specific fields of existing record. 
     * NOTE: Expects all the mandatory fields be re-stated as part of the data parameter.
     *
     * @param {VtigerModule} module
     * @param {number} recordId
     * @param {*} data
     * @returns {Promise<VtigerResponse>}
     */
    async update(module: VtigerModule, recordId: number, data: any): Promise<VtigerResponse> {

        try {

            const moduleId = this.getModuleId(module);

            data.id = `${moduleId}x${recordId}`;

            const params = new URLSearchParams();
            params.append('operation', 'update');
            params.append('sessionName', this.sessionId);
            params.append('element', JSON.stringify(data));

            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            const response = await axios.post(this.webserviceUrl, params, config)

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Delete existing record
     *
     * @param {VtigerModule} module
     * @param {number} recordId
     * @returns {Promise<VtigerResponse>}
     */
    async delete(module: VtigerModule, recordId: number): Promise<VtigerResponse> {

        try {

            const moduleId = this.getModuleId(module);

            const params = new URLSearchParams();
            params.append('operation', 'delete');
            params.append('sessionName', this.sessionId);
            params.append('id', `${moduleId}x${recordId}`);

            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            const response = await axios.post(this.webserviceUrl, params, config)

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Retrieve one or more records matching filtering field conditions.
     *
     * @param {string} query
     * @returns {Promise<VtigerResponse>}
     * @example select * | field_list | count(*)
        from module where conditions
        order by field_list limit m, n;
    
        - field_list: should be comma-separated list of fieldname.
        - conditions can have expression having
        - - operators: <, >, <#, >#, #, !#
        - - clauses: in ( ), like ‘sql_regex’
        - limit m, n: m representing offset, n representing count.
     */
    async query(query: string): Promise<VtigerResponse> {

        try {

            const response = await axios.get(this.webserviceUrl, {
                params: {
                    operation: 'query',
                    sessionName: this.sessionId,
                    query: query
                }
            });

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Get details about the module accessible to user.
     *
     * @returns {Promise<VtigerResponse>}
     * @memberof VtigerClient
     */
    async listTypes(): Promise<VtigerResponse> {

        try {

            const response = await axios.get(this.webserviceUrl, {
                params: {
                    operation: 'listtypes',
                    sessionName: this.sessionId
                }
            });

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Metadata of module provides information about record-permissions, blocks, field configuration for performing operation further.
     *
     * @param {VtigerModule} module
     * @returns {Promise<VtigerResponse>}
     */
    async describe(module: VtigerModule): Promise<VtigerResponse> {

        try {

            const moduleName = this.getModuleName(module);

            const response = await axios.get(this.webserviceUrl, {
                params: {
                    operation: 'describe',
                    sessionName: this.sessionId,
                    elementType: moduleName
                }
            });

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * When you need related records of a target record
     *
     * @param {VtigerModule} module
     * @param {number} recordId
     * @param {VtigerModule} relatedModule
     * @param {string} relatedLabel
     * @returns {Promise<VtigerResponse>}
     * @memberof VtigerClient
     */
    async retrieveRelated(module: VtigerModule, recordId: number, relatedModule: VtigerModule, relatedLabel: string): Promise<VtigerResponse> {

        try {

            const moduleId = this.getModuleId(module);
            const relateModuleName = this.getModuleName(relatedModule);

            const response = await axios.get(this.webserviceUrl, {
                params: {
                    operation: 'retrieve_related',
                    sessionName: this.sessionId,
                    id: `${moduleId}x${recordId}`,
                    relatedLabel: relatedLabel,
                    relatedType: relateModuleName
                }
            });

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * What relationship a module has with other
     *
     * @param {VtigerModule} module
     * @returns {Promise<VtigerResponse>}
     * @memberof VtigerClient
     */
    async relatedTypes(module: VtigerModule): Promise<VtigerResponse> {

        try {

            const moduleName = this.getModuleName(module);

            const response = await axios.get(this.webserviceUrl, {
                params: {
                    operation: 'relatedtypes',
                    sessionName: this.sessionId,
                    elementType: moduleName
                }
            });

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Fetch related records matching a search criteria.
     *
     * @param {VtigerModule} module
     * @param {number} recordId
     * @param {string} relatedLabel
     * @returns {Promise<VtigerResponse>}
     * @memberof VtigerClient
     */
    async queryRelated(module: VtigerModule, recordId: number, relatedLabel: string): Promise<VtigerResponse> {

        try {

            const moduleId = this.getModuleId(module);
            const moduleName = this.getModuleName(module);

            const response = await axios.get(this.webserviceUrl, {
                params: {
                    operation: 'query_related',
                    sessionName: this.sessionId,
                    query: `SELECT * FROM ${moduleName}`,
                    id: `${moduleId}x${recordId}`,
                    relatedLabel: relatedLabel
                }
            });

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Break existing relationship between two records.
     *
     * @param {VtigerModule} sourceModule
     * @param {number} sourceRecordId
     * @param {VtigerModule} relatedModule
     * @param {number} relatedRecordId
     * @returns {Promise<VtigerResponse>}
     * @memberof VtigerClient
     */
    async deleteRelated(sourceModule: VtigerModule, sourceRecordId: number, relatedModule: VtigerModule, relatedRecordId: number): Promise<VtigerResponse> {

        try {

            const sourceModuleId = this.getModuleId(sourceModule);
            const relatedModuleId = this.getModuleId(relatedModule);

            const params = new URLSearchParams();
            params.append('operation', 'delete_related');
            params.append('sessionName', this.sessionId);
            params.append('sourceRecordId', `${sourceModuleId}x${sourceRecordId}`);
            params.append('relatedRecordId', `${relatedModuleId}x${relatedRecordId}`);

            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            const response = await axios.post(this.webserviceUrl, params, config)

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Create relation between two records.
     *
     * @param {VtigerModule} sourceModule
     * @param {number} sourceRecordId
     * @param {VtigerModule} relatedModule
     * @param {number} relatedRecordId
     * @param {string} relationIdLabel
     * @returns 
     * @memberof VtigerClient
     */
    async addRelated(sourceModule: VtigerModule, sourceRecordId: number, relatedModule: VtigerModule, relatedRecordId: number, relationIdLabel: string) {

        try {

            const sourceModuleId = this.getModuleId(sourceModule);
            const relatedModuleId = this.getModuleId(relatedModule);

            const params = new URLSearchParams();
            params.append('operation', 'add_related');
            params.append('sessionName', this.sessionId);
            params.append('sourceRecordId', `${sourceModuleId}x${sourceRecordId}`);
            params.append('relatedRecordId', `${relatedModuleId}x${relatedRecordId}`);
            params.append('relationIdLabel', relationIdLabel);

            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            const response = await axios.post(this.webserviceUrl, params, config)

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }



    /**
     * Destroy current session
     *
     * @returns {Promise<VtigerResponse>}
     * @memberof VtigerClient
     */
    async logout(): Promise<VtigerResponse> {

        try {

            const params = new URLSearchParams();
            params.append('operation', 'logout');
            params.append('sessionName', this.sessionId);

            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            const response = await axios.post(this.webserviceUrl, params, config)

            return Promise.resolve(response.data);

        } catch (error) {
            return Promise.reject(error);
        }

    }





    // Utils
    private getModuleId(module: VtigerModule): number | null {
        switch (module) {

            case 'calendar':
                return 9;
            case 'leads':
                return 2;
            case 'accounts':
                return 3;
            case 'contacts':
                return 4;
            case 'potentials':
                return 5;
            case 'products':
                return 6;
            case 'documents':
                return 7;
            case 'emails':
                return 8;
            case 'helpdesk':
                return 9;
            case 'faq':
                return 10;
            case 'vendors':
                return 11;
            case 'pricebooks':
                return 12;
            case 'quotes':
                return 13;
            case 'purchaseorder':
                return 14;
            case 'salesorder':
                return 15;
            case 'invoice':
                return 16;
            case 'campaigns':
                return 17;
            case 'events':
                return 18;
            case 'users':
                return 19;
            case 'groups':
                return 20;
            case 'currency':
                return 21;
            case 'documentfolders':
                return 22;

            default:
                return null;
        }
    }

    private getModuleName(module: VtigerModule): string | null {
        switch (module) {

            case 'calendar':
                return 'Calendar';
            case 'leads':
                return 'Leads';
            case 'accounts':
                return 'Accounts';
            case 'contacts':
                return 'Contacts';
            case 'potentials':
                return 'Potentials';
            case 'products':
                return 'Products';
            case 'documents':
                return 'Documents';
            case 'emails':
                return 'Emails';
            case 'helpdesk':
                return 'HelpDesk';
            case 'faq':
                return 'Faq';
            case 'vendors':
                return 'Vendors';
            case 'pricebooks':
                return 'PriceBooks';
            case 'quotes':
                return 'Quotes';
            case 'purchaseorder':
                return 'PurchaseOrder';
            case 'salesorder':
                return 'SalesOrder';
            case 'invoice':
                return 'Invoice';
            case 'campaigns':
                return 'Campaigns';
            case 'events':
                return 'Events';
            case 'users':
                return 'Users';
            case 'groups':
                return 'Groups';
            case 'currency':
                return 'Currency';
            case 'documentfolders':
                return 'DocumentFolders';

            default:
                return null;
        }
    }


}


module.exports = VtigerApiClient;
