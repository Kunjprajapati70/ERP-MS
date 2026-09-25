import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import ErrorScreen from '../../components/ErrorScreen';

export default function ServerErrorPage() {
  return (
    <ErrorScreen
      statusCode="500"
      title="Internal Server Error"
      message="An unexpected error occurred while processing your request. Our system engineering team has been notified. Please try again in a few moments."
      icon={CloudOffRoundedIcon}
      gradient="linear-gradient(135deg, #EA580C 0%, #FB923C 50%, #FBBF24 100%)"
      color="#EA580C"
      actionType="dashboard"
    />
  );
}
