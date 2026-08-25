import { HelpAnnouncementComment, UserProfile } from '../types';
import DiscussionComments from './DiscussionComments';

interface AnnouncementCommentsProps {
  announcementId: string;
  postedByUserId: string;
  comments: HelpAnnouncementComment[];
  currentUserId?: string;
  userProfile?: UserProfile | null;
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onRequireSignIn?: () => void;
  onViewProfile?: (userId: string) => void;
}

export default function AnnouncementComments(props: AnnouncementCommentsProps) {
  return (
    <DiscussionComments
      entityId={props.announcementId}
      scope="announcement"
      postedByUserId={props.postedByUserId}
      comments={props.comments}
      currentUserId={props.currentUserId}
      userProfile={props.userProfile}
      onAddComment={props.onAddComment}
      onDeleteComment={props.onDeleteComment}
      onRequireSignIn={props.onRequireSignIn}
      onViewProfile={props.onViewProfile}
    />
  );
}
