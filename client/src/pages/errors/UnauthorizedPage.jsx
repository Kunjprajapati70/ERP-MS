import GppMaybeRoundedIcon from '@mui/icons-material/GppMaybeRounded';
import ErrorScreen from '../../components/ErrorScreen';

export default function UnauthorizedPage() {
  return (
    <ErrorScreen
      statusCode="401"
      title="Authentication Required"
      message="Your session has expired or you are not signed in. Please log in with valid credentials to continue."
      icon={GppMaybeRoundedIcon}
      gradient="linear-gradient(135deg, #7C3AED 0%, #A78BFA 50%, #EC4899 100%)"
      color="#7C3AED"
      actionType="login"
    />
  );
}
