import PropTypes from 'prop-types';
import { connect } from 'react-redux';

const mapStateToProps = ({ auth: { units } }) => ({ unitList: units });
const UnitNamesLabels = ({ units, unitList }) =>
  (unitList || [])
    .filter(({ id }) => units.includes(id))
    .map(({ name }) => name)
    .join(', ');

UnitNamesLabels.propTypes = {
  units: PropTypes.array,
};

UnitNamesLabels.defaultProps = {
  units: [],
};

export default connect(mapStateToProps)(UnitNamesLabels);
