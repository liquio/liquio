import React from 'react';
import { Card, IconButton, CardHeader, CardContent } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { connect } from 'react-redux';
import CreateIcon from '@mui/icons-material/Create';

import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import evaluate from 'helpers/evaluate';
import { JsonSchemaNode } from '../../types';

import styles from './styles';

interface CardBlockAction {
  title?: string;
  link?: string | (() => string);
  icon?: string;
  hidden?: string | (() => boolean);
  style?: React.CSSProperties;
  userHasUnit?: Array<string | number>;
}

interface CardBlockProps extends WithStyles<typeof styles> {
  title?: string;
  subTitle?: string;
  action?: CardBlockAction;
  styles?: React.CSSProperties;
  properties?: Record<string, JsonSchemaNode>;
  readOnly?: boolean;
  rootDocument?: { data?: Record<string, unknown> };
  hidden?: boolean;
  userUnits: Array<{ id: string | number; [key: string]: unknown }> | null;
  [key: string]: unknown;
}

const CardBlock = ({
  classes,
  title = '',
  subTitle = '',
  action: {
    title: btnTitle,
    link: btnLink = () => '',
    icon: btnIcon,
    hidden: btnHidden = () => false,
    style: btnStyle = {},
    userHasUnit = [],
  } = {},
  styles: inlineStyles = {},
  properties,
  readOnly,
  rootDocument,
  hidden,
  userUnits,
  ...rest
}: CardBlockProps) => {
  const [value, setValue] = React.useState<Record<string, unknown>>({});
  /* Get dynamic values */
  const resultBtnLink = evaluate(btnLink as unknown as string, rootDocument?.data);
  const resultBtnHidden = evaluate(btnHidden as unknown as string, rootDocument?.data);
  /* End */

  /* show link for some unit */
  const showLinkForSomeUnit = (userUnits || []).some(({ id }) =>
    userHasUnit.includes(id),
  );
  /* End */

  if (hidden) return null;

  return (
    <Card
      className={classes.card}
      style={{
        ...inlineStyles,
      }}
    >
      <CardHeader
        classes={{
          root: classes.cardHeader,
          action: classes.cardHeaderAction,
          content: classes.cardHeaderContent,
        }}
        action={
          resultBtnLink && btnTitle && showLinkForSomeUnit ? (
            <Link
              to={resultBtnLink as string}
              className={classNames(classes.link, {
                [classes.linkHidden]: !!resultBtnHidden,
              })}
            >
              <IconButton
                component="div"
                disableRipple
                className={classes.button}
                style={{ ...btnStyle }}
                size="large"
              >
                {btnIcon ? (
                  <span
                    className={classes.buttonIcon}
                    style={{
                      backgroundImage: `url(${btnIcon})`,
                    }}
                  />
                ) : (
                  <CreateIcon />
                )}
                {btnTitle}
              </IconButton>
            </Link>
          ) : null
        }
        title={title}
        subheader={subTitle}
      />
      <CardContent className={classes.cardContent}>
        {Object.keys(properties || {}).map((key) => (
          <SchemaForm
            {...rest}
            key={key}
            rootDocument={rootDocument}
            schema={(properties as Record<string, JsonSchemaNode>)[key]}
            readOnly={readOnly || (properties as Record<string, JsonSchemaNode>)[key].readOnly}
            value={value}
            onChange={handleChangeAdapter(value, setValue as unknown as (documentData: unknown, meta: { dataPath: string; changes: unknown }) => void)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

const mapStateToProps = ({ auth: { userUnits } }: { auth: { userUnits: CardBlockProps['userUnits'] } }) => ({ userUnits });

const styled = withStyles(styles)(CardBlock);
export default connect(mapStateToProps, null)(styled);
