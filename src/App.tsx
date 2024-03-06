import React, { useEffect, useState } from 'react';
import './App.css';
import { IAMClient } from "@aws-sdk/client-iam";
import getListRoleArn from './tools';
import { Button, Stack, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';


interface Setting {
  extId: string
  awsRegion: string
  awsAccessKeyId: string
  awsSecretAccessKey: string
  email: string
  exclude: string
  config?: string
}

function getDefaultSetting(): Setting {
  return { 
    extId: '',
    awsRegion: 'ap-northeast-2',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    email: '',
    exclude: 'terraform-runner',
  };
}

async function getSettingsFromStorage() {
  return chrome.storage.sync.get(getDefaultSetting());
}

async function saveSettingsToStorage(setting: Setting) {
  await chrome.storage.sync.set(setting)
}

function getRoleNameFromArn(arn: string): string {
  // Split the ARN by ':' and take the last segment ('role/ExampleRoleName'),
  // then split by '/' and take the last part ('ExampleRoleName').
  const parts = arn.split(':');
  const lastPart = parts[parts.length - 1]; // 'role/ExampleRoleName'
  return lastPart.split('/')[1]; // 'ExampleRoleName'
}

function sortRoleArnByRoleName(arns: string[]): string[] {
  // Use the sort() method with a custom comparator function
  return arns.sort((a, b) => {
      // Extract role names for comparison
      const roleNameA = getRoleNameFromArn(a);
      const roleNameB = getRoleNameFromArn(b);
      // Use localeCompare for a standard alphabetical sort
      return roleNameA.localeCompare(roleNameB);
  });
}

function makeConfig(arns: string[]): string {
  const template = (arn: string) => (
    `[${getRoleNameFromArn(arn)}]\nrole_arn = ${arn}\ncolor = 000000`
  );

  return arns.map(arn => template(arn)).join("\n\n");
}

async function sendConfig(extId: string, config: string) {
  await chrome.runtime.sendMessage(extId, {
    action: 'updateConfig',
    dataType: 'ini',
    data: config
  })
}

function App() {

  const [extIdState, setExtIdState] = useState('');
  const [awsRegionState, setAwsRegionState] = useState('');
  const [awsAccessKeyIdState, setAwsAccessKeyIdState] = useState('');
  const [awsSecretAccessKeyState, setAwsSecretAccessKeyState] = useState('');
  const [emailState, setEmailState] = useState('');
  const [excludeState, setExcludeState] = useState('');
  const [syncStatus, setSyncStatus] = useState(false);

  useEffect(() => {
    const fn = async () => {
      const settings = await getSettingsFromStorage();
      setExtIdState(settings.extId);
      setAwsRegionState(settings.awsRegion);
      setAwsAccessKeyIdState(settings.awsAccessKeyId);
      setAwsSecretAccessKeyState(settings.awsSecretAccessKey);
      setEmailState(settings.email);
      setExcludeState(settings.exclude);
    }
    fn();
  }, []);

  const save = async () => {
    await saveSettingsToStorage({
      extId: extIdState,
      awsRegion: awsRegionState,
      awsAccessKeyId: awsAccessKeyIdState,
      awsSecretAccessKey: awsSecretAccessKeyState,
      email: emailState,
      exclude: excludeState,
    });
  }

  const sync = async () => {
    setSyncStatus(true);

    const client = new IAMClient({
      region: awsRegionState,
      credentials: {
        accessKeyId: awsAccessKeyIdState,
        secretAccessKey: awsSecretAccessKeyState
      }
    })

    const excludeList: string[] = excludeState.split(";");
    
    const assumeRoleArns = await getListRoleArn(client, emailState);
    const filteredRoleArns = assumeRoleArns.filter(arn => excludeList.every(e => !arn.includes(e)));
    const sortedRoleArns = sortRoleArnByRoleName(filteredRoleArns);
    const config = makeConfig(sortedRoleArns);

    await save();
    await chrome.storage.sync.set({ config });
    await sendConfig(extIdState, config);

    setSyncStatus(false);
  }

  return (
    <Stack direction="row" spacing={2} minWidth={420} margin={2}>
      <Stack spacing={2} minWidth={300}>
        <TextField value={extIdState} onChange={(e) => setExtIdState(e.target.value)} size="small" variant="standard" label="Extension ID" />
        <TextField value={awsRegionState} onChange={(e) => setAwsRegionState(e.target.value)} size="small" variant="standard" label="AWS Region" />
        <TextField value={awsAccessKeyIdState} onChange={(e) => setAwsAccessKeyIdState(e.target.value)} size="small" variant="standard" label="AWS Access Key ID" />
        <TextField value={awsSecretAccessKeyState} onChange={(e) => setAwsSecretAccessKeyState(e.target.value)} size="small" variant="standard" label="AWS Secret Access Key" type="password" />
        <TextField value={emailState} onChange={(e) => setEmailState(e.target.value)} size="small" variant="standard" label="Email Address" />
        <TextField value={excludeState} onChange={(e) => setExcludeState(e.target.value)} size="small" variant="standard" label="Excludes ( split ; )" />
      </Stack>
      <Stack spacing={2} justifyContent="flex-end">
        <Button onClick={save} variant="outlined">Save</Button>
        <LoadingButton
          loading={syncStatus}
          loadingPosition='center'
          variant="outlined"
          onClick={sync}
        >
          Sync
        </LoadingButton>
      </Stack>
  </Stack>
  );
}

export default App;