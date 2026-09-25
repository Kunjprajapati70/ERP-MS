import EngineeringRoundedIcon from '@mui/icons-material/EngineeringRounded';
import ErrorScreen from '../../components/ErrorScreen';

export default function ServiceUnavailablePage() {
  return (
    <ErrorScreen
      statusCode="503"
      title="Service Unavailable"
      message="The ERP system or its backend database is currently under planned maintenance. Normal service will resume shortly."
      icon={EngineeringRoundedIcon}
      gradient="linear-gradient(135deg, #059669 0%, #34D399 50%, #2DD4BF 100%)"
      color="#059669"
      actionType="dashboard"
    />
  );
}
