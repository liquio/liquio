import React from 'react';
import { Editor } from './JsonSchemaProvider';
import ElementDesktop from './components/ElementDesktop';

const JsonSchemaEditor = (props) => (
  <Editor {...props}>
    <ElementDesktop {...props} />
  </Editor>
);

export default JsonSchemaEditor;
