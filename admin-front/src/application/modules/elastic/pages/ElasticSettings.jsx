import React from 'react';
import { useTranslate } from 'react-translate';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import DataTable from 'components/DataTable';
import TimeLabel from 'components/Label/Time';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import asModulePage from 'hooks/asModulePage';
import useReindex from './hooks/useReindex';
import ReindexRequestStatus from '../components/ReindexRequestStatus';

const moduleElasticSettings = asModulePage(ElasticSettings);

// Removed the export of ElasticSettings as it is no longer used.
