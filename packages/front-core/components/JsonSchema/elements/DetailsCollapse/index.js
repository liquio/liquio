import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import objectPath from 'object-path';
import Details from './components/Details';
import Accordion from './components/Accordion';

const DetailsCollapse = ({
  htmlBlock,
  params,
  hidden,
  rootDocument,
  collapseText,
  openText,
  dataMapping,
  dataPath,
  parentValue,
  useParentData,
  stepName,
  pure,
  accordion,
  fullWidth,
}) => {
  if (hidden) return null;

  if (dataPath) {
    const getDataPath = objectPath.get(rootDocument.data, dataPath);

    if (!getDataPath) return null;

    return (
      <>
        {getDataPath.map((option) => (
          <Accordion
            key={option?.id}
            option={option}
            useParentData={useParentData}
            htmlBlock={htmlBlock}
            params={params}
            parentValue={parentValue}
            rootDocument={rootDocument}
            dataMapping={dataMapping}
            stepName={stepName}
            pure={pure}
            openText={openText}
            fullWidth={fullWidth}
            dataPath={dataPath}
          />
        ))}
      </>
    );
  }

  if (accordion) {
    return (
      <Accordion
        useParentData={useParentData}
        htmlBlock={htmlBlock}
        params={params}
        parentValue={parentValue}
        rootDocument={rootDocument}
        dataMapping={dataMapping}
        stepName={stepName}
        pure={pure}
        openText={openText}
        fullWidth={fullWidth}
        dataPath={dataPath}
      />
    );
  }

  return (
    <Details
      useParentData={useParentData}
      htmlBlock={htmlBlock}
      params={params}
      parentValue={parentValue}
      rootDocument={rootDocument}
      dataMapping={dataMapping}
      stepName={stepName}
      pure={pure}
      collapseText={collapseText}
      openText={openText}
    />
  );
};

DetailsCollapse.propTypes = {
  rootDocument: PropTypes.object.isRequired,
  dataMapping: PropTypes.string.isRequired,
  htmlBlock: PropTypes.string,
  hidden: PropTypes.bool,
  params: PropTypes.object,
  collapseText: PropTypes.string,
  openText: PropTypes.string,
  parentValue: PropTypes.object,
  useParentData: PropTypes.bool,
  stepName: PropTypes.string,
  pure: PropTypes.bool,
  accordion: PropTypes.bool,
  fullWidth: PropTypes.bool,
  dataPath: PropTypes.string,
};

DetailsCollapse.defaultProps = {
  htmlBlock: '',
  hidden: false,
  params: null,
  collapseText: null,
  openText: null,
  parentValue: {},
  stepName: '',
  useParentData: false,
  pure: false,
  accordion: false,
  fullWidth: false,
  dataPath: false,
};

export default translate('Elements')(DetailsCollapse);
