import ace from 'ace-builds/src-noconflict/ace';
import javascriptWorkerUrl from 'ace-builds/src-noconflict/worker-javascript.js?url';
import jsonWorkerUrl from 'ace-builds/src-noconflict/worker-json.js?url';

ace.config.setModuleUrl('ace/mode/javascript_worker', javascriptWorkerUrl);
ace.config.setModuleUrl('ace/mode/json_worker', jsonWorkerUrl);
