import React from 'react';
import { Card, IconButton, CardHeader, CardContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { connect } from 'react-redux';
import CreateIcon from '@mui/icons-material/Create';

import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import evaluate from 'helpers/evaluate';

import styles from './styles';

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
  styles = {},
  properties,
  readOnly,
  rootDocument,
  hidden,
  userUnits,
  ...rest
}) => {
  const [value, setValue] = React.useState({});
  /* Get dynamic values */
  const resultBtnLink = evaluate(btnLink, rootDocument?.data);
  const resultBtnHidden = evaluate(btnHidden, rootDocument?.data);
  /* End */

  /* show link for some unit */
  const showLinkForSomeUnit = userUnits.some(({ id }) =>
    userHasUnit.includes(id),
  );
  /* End */

  if (hidden) return null;

  return (
    <Card
      className={classes.card}
      style={{
        ...styles,
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
              to={resultBtnLink}
              className={classNames(classes.link, {
                [classes.linkHidden]: resultBtnHidden,
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
            schema={properties[key]}
            readOnly={readOnly || properties[key].readOnly}
            value={value}
            onChange={handleChangeAdapter(value, setValue)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

const mapStateToProps = ({ auth: { userUnits } }) => ({ userUnits });

const styled = withStyles(styles)(CardBlock);
export default connect(mapStateToProps, null)(styled);
