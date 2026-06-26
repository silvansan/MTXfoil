import * as migration_20260625_163950_initial from './20260625_163950_initial';
import * as migration_20260625_200000_stream_ingest_protocol from './20260625_200000_stream_ingest_protocol';
import * as migration_20260626_120000_protocol_settings_auth from './20260626_120000_protocol_settings_auth';
import * as migration_20260626_140000_audit_logs from './20260626_140000_audit_logs';
import * as migration_20260626_150000_protocol_rtmps_llhls from './20260626_150000_protocol_rtmps_llhls';
import * as migration_20260626_160000_audit_logs_locked_documents_rel from './20260626_160000_audit_logs_locked_documents_rel';

export const migrations = [
  {
    up: migration_20260625_163950_initial.up,
    down: migration_20260625_163950_initial.down,
    name: '20260625_163950_initial'
  },
  {
    up: migration_20260625_200000_stream_ingest_protocol.up,
    down: migration_20260625_200000_stream_ingest_protocol.down,
    name: '20260625_200000_stream_ingest_protocol'
  },
  {
    up: migration_20260626_120000_protocol_settings_auth.up,
    down: migration_20260626_120000_protocol_settings_auth.down,
    name: '20260626_120000_protocol_settings_auth'
  },
  {
    up: migration_20260626_140000_audit_logs.up,
    down: migration_20260626_140000_audit_logs.down,
    name: '20260626_140000_audit_logs'
  },
  {
    up: migration_20260626_150000_protocol_rtmps_llhls.up,
    down: migration_20260626_150000_protocol_rtmps_llhls.down,
    name: '20260626_150000_protocol_rtmps_llhls'
  },
  {
    up: migration_20260626_160000_audit_logs_locked_documents_rel.up,
    down: migration_20260626_160000_audit_logs_locked_documents_rel.down,
    name: '20260626_160000_audit_logs_locked_documents_rel'
  },
];
