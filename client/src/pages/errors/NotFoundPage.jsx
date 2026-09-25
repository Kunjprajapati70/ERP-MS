import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import ErrorScreen from '../../components/ErrorScreen';

export default function NotFoundPage() {
  return (
    <ErrorScreen
      statusCode="404"
      title="Page Not Found"
      message="The page you requested could not be located. It might have been relocated, deleted, or the URL may be mistyped."
      icon={TravelExploreRoundedIcon}
      gradient="linear-gradient(135deg, #0284C7 0%, #38BDF8 50%, #818CF8 100%)"
      color="#0284C7"
      actionType="dashboard"
    />
  );
}
