import LockPersonRoundedIcon from '@mui/icons-material/LockPersonRounded';
import ErrorScreen from '../../components/ErrorScreen';

export default function ForbiddenPage() {
  return (
    <ErrorScreen
      statusCode="403"
      title="Access Restricted"
      message="You do not have the required permissions to access this module or resource. Please contact your workspace administrator if you require access."
      icon={LockPersonRoundedIcon}
      gradient="linear-gradient(135deg, #DC2626 0%, #F87171 50%, #FB923C 100%)"
      color="#DC2626"
      actionType="dashboard"
    />
  );
}
