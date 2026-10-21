import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '../components/common/AuthLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import RoleSelectionPage from '../pages/RoleSelectionPage';
import { UserRegister, UserLogin } from '../pages/user/AuthPages';
import { AstrologerRegister, AstrologerLogin } from '../pages/astrologer/AuthPages';
import Dashboard from '../pages/Dashboard';
import ExploreAstrologersPage from '../pages/user/ExploreAstrologersPage';
import AstrologerProfilePage from '../pages/user/AstrologerProfilePage';
import AstrologerProfileEditPage from '../pages/astrologer/AstrologerProfileEditPage';
import QuestionPurchasePage from '../pages/user/QuestionPurchasePage';
import PurchaseSuccessPage from '../pages/user/PurchaseSuccessPage';
import SubmitQuestionPage from '../pages/user/SubmitQuestionPage';
import QuestionTrackingPage from '../pages/user/QuestionTrackingPage';
import MyQuestionsPage from '../pages/user/MyQuestionsPage';
import WalletPage from '../pages/user/WalletPage';
import DisputePage from '../pages/user/DisputePage';
import UserSubscriptionsPage from '../pages/user/UserSubscriptionsPage';
import SubscriptionCheckoutPage from '../pages/user/SubscriptionCheckoutPage';
import LiveLobbyPage from '../pages/user/LiveLobbyPage';
import LiveRoomPage from '../pages/user/LiveRoomPage';
import LiveQuestionPurchasePage from '../pages/user/LiveQuestionPurchasePage';
import SubmitLiveQuestionPage from '../pages/user/SubmitLiveQuestionPage';
import TextQuestionSalesPage from '../pages/astrologer/TextQuestionSalesPage';
import AnswerQuestionsPage from '../pages/astrologer/AnswerQuestionsPage';
import AstrologerWalletPage from '../pages/astrologer/AstrologerWalletPage';
import AstrologerAudienceDashboardPage from '../pages/astrologer/AstrologerAudienceDashboardPage';
import AstrologerAudienceHandlingPage from '../pages/astrologer/AstrologerAudienceHandlingPage';
import AstrologerSubscriberCrmPage from '../pages/astrologer/AstrologerSubscriberCrmPage';
import AstrologerPerksCreatePage from '../pages/astrologer/AstrologerPerksCreatePage';
import AstrologerLiveDashboardPage from '../pages/astrologer/AstrologerLiveDashboardPage';
import CreateLiveSessionPage from '../pages/astrologer/CreateLiveSessionPage';
import LiveSessionRoomPage from '../pages/astrologer/LiveSessionRoomPage';
import OnboardingPage from '../pages/user/OnboardingPage';
import AstrologerOnboardingPage from '../pages/astrologer/AstrologerOnboardingPage';
import ForgotPasswordPage from '../pages/user/ForgotPasswordPage';
import ActiveSessionsPage from '../pages/user/ActiveSessionsPage';
import AppointmentBookingPage from '../pages/user/AppointmentBookingPage';
import UserAppointmentsPage from '../pages/user/UserAppointmentsPage';
import AstrologerAppointmentsPage from '../pages/astrologer/AstrologerAppointmentsPage';
import VideoCallPage from '../pages/user/VideoCallPage';
import NotificationCenterPage from '../pages/user/NotificationCenterPage';
import NotificationPreferencesPage from '../pages/user/NotificationPreferencesPage';
import PaymentHistoryPage from '../pages/user/PaymentHistoryPage';
import EscrowDashboardPage from '../pages/astrologer/EscrowDashboardPage';
import ChatPage from '../pages/user/ChatPage';
import AstrologerChatPage from '../pages/astrologer/AstrologerChatPage';
import AstrologerAnalyticsPage from '../pages/astrologer/AstrologerAnalyticsPage';
import FreeCalculationsPage from '../pages/user/FreeCalculationsPage';
import NumerologyPage from '../pages/user/NumerologyPage';
import BirthChartPage from '../pages/user/BirthChartPage';
import NakshatraPage from '../pages/user/NakshatraPage';
import DasaBhuktiPage from '../pages/user/DasaBhuktiPage';
import MarriageMatchingPage from '../pages/user/MarriageMatchingPage';
import PanchangPage from '../pages/user/PanchangPage';
import BabyNamePage from '../pages/user/BabyNamePage';
import AiChatPage from '../pages/user/AiChatPage';
import AstrologerContentListPage from '../pages/astrologer/AstrologerContentListPage';
import AstrologerContentCreatePage from '../pages/astrologer/AstrologerContentCreatePage';
import UserFreeInformationPage from '../pages/user/UserFreeInformationPage';
import UserPerksPage from '../pages/user/UserPerksPage';
import UserContentDetailPage from '../pages/user/UserContentDetailPage';
import UserAtonementHistoryPage from '../pages/user/UserAtonementHistoryPage';
import UserAtonementDetailPage from '../pages/user/UserAtonementDetailPage';
import AtonementDashboardPage from '../pages/astrologer/AtonementDashboardPage';
import IndividualAtonementTrackingPage from '../pages/astrologer/IndividualAtonementTrackingPage';
import AtonementRevenuePage from '../pages/astrologer/AtonementRevenuePage';
import DiscountCodeManagementPage from '../pages/astrologer/DiscountCodeManagementPage';
import AstrologerSubscriptionPlansPage from '../pages/astrologer/AstrologerSubscriptionPlansPage';
import AccountsManagementPage from '../pages/astrologer/AccountsManagementPage';
import AddStaffPage from '../pages/astrologer/AddStaffPage';
import StaffDetailPage from '../pages/astrologer/StaffDetailPage';
import ActivityLogsPage from '../pages/astrologer/ActivityLogsPage';
import KillSwitchPage from '../pages/astrologer/KillSwitchPage';
import UserDisputeListPage from '../pages/user/UserDisputeListPage';
import UserDisputeDetailPage from '../pages/user/UserDisputeDetailPage';
import AstrologerDisputePage from '../pages/astrologer/AstrologerDisputePage';
import UserEmergencyCallsPage from '../pages/user/UserEmergencyCallsPage';
import AstrologerEmergencyPage from '../pages/astrologer/AstrologerEmergencyPage';
import UserProfilePage from '../pages/user/UserProfilePage';
import UserProfileEditPage from '../pages/user/UserProfileEditPage';
import UserFamilyProfileFormPage from '../pages/user/UserFamilyProfileFormPage';
import AstrologerProfilePreviewPage from '../pages/astrologer/AstrologerProfilePreviewPage';
import DailyHoroscopePage from '../pages/user/DailyHoroscopePage';
import AstrologerReviewsPage from '../pages/user/AstrologerReviewsPage';
import ConsultationHistoryPage from '../pages/user/ConsultationHistoryPage';
import UserNotificationBellPage from '../pages/user/UserNotificationBellPage';
import MuhurthamPage from '../pages/user/MuhurthamPage';
import AstrologerSchedulePage from '../pages/astrologer/AstrologerSchedulePage';
import AstrologerEarningsPage from '../pages/astrologer/AstrologerEarningsPage';
import AstrologerWithdrawalPage from '../pages/astrologer/AstrologerWithdrawalPage';
import AstrologerTemplatesPage from '../pages/astrologer/AstrologerTemplatesPage';
import AstrologerClientNotesPage from '../pages/astrologer/AstrologerClientNotesPage';
import AstrologerProfileCompletionPage from '../pages/astrologer/AstrologerProfileCompletionPage';
import AstrologerReviewManagementPage from '../pages/astrologer/AstrologerReviewManagementPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/user/contents/free-information" />} />

      {/* Register Role Selection */}
      <Route path="/register" element={<RoleSelectionPage />} />

      {/* User Auth */}
      <Route path="/user/register" element={
        <AuthLayout eyebrow="BEGIN YOUR JOURNEY" title={<>A little closer to<br /><em>your universe.</em></>} description="Create your space for clarity, connection and celestial guidance." aside={<div className="aside-list"><span>✦ Personalized cosmic insights</span><span>✦ Trusted astrologer guidance</span><span>✦ Your privacy, always</span></div>}>
          <UserRegister />
        </AuthLayout>
      } />
      <Route path="/user/login" element={
        <AuthLayout eyebrow="WELCOME BACK" title={<>The stars have been<br /><em>waiting for you.</em></>} description="Sign in to continue your journey of self-discovery." aside={<div className="quote">"We are all in the gutter, but some of us are looking at the stars."<small>— Oscar Wilde</small></div>}>
          <UserLogin />
        </AuthLayout>
      } />
      <Route path="/user/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/user/onboarding" element={<OnboardingPage />} />
      <Route path="/user/sessions" element={<ActiveSessionsPage />} />

      {/* User Pages (Protected) */}
      <Route path="/user/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/user/astrologers" element={<ProtectedRoute><ExploreAstrologersPage /></ProtectedRoute>} />
      <Route path="/user/astrologers/:astrologerId" element={<ProtectedRoute><AstrologerProfilePage /></ProtectedRoute>} />
      <Route path="/user/astrologers/:astrologerId/book" element={<ProtectedRoute><AppointmentBookingPage /></ProtectedRoute>} />
      <Route path="/user/appointments" element={<ProtectedRoute><UserAppointmentsPage /></ProtectedRoute>} />
      <Route path="/user/appointments/:appointmentId/call" element={<ProtectedRoute><VideoCallPage /></ProtectedRoute>} />
      <Route path="/user/question-purchase/:campaignId" element={<ProtectedRoute><QuestionPurchasePage /></ProtectedRoute>} />
      <Route path="/user/question-purchase/success/:purchaseId" element={<ProtectedRoute><PurchaseSuccessPage /></ProtectedRoute>} />
      <Route path="/user/submit-question/:purchaseId" element={<ProtectedRoute><SubmitQuestionPage /></ProtectedRoute>} />
      <Route path="/user/questions" element={<ProtectedRoute><MyQuestionsPage /></ProtectedRoute>} />
      <Route path="/user/questions/:questionId" element={<ProtectedRoute><QuestionTrackingPage /></ProtectedRoute>} />
      <Route path="/user/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
      <Route path="/user/dispute/:questionId" element={<ProtectedRoute><DisputePage /></ProtectedRoute>} />
      <Route path="/user/subscriptions" element={<ProtectedRoute><UserSubscriptionsPage /></ProtectedRoute>} />
      <Route path="/user/subscriptions/:astrologerId/subscribe" element={<ProtectedRoute><SubscriptionCheckoutPage /></ProtectedRoute>} />
      <Route path="/user/notifications" element={<ProtectedRoute><NotificationCenterPage /></ProtectedRoute>} />
      <Route path="/user/notification-preferences" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />
      <Route path="/user/payments" element={<ProtectedRoute><PaymentHistoryPage /></ProtectedRoute>} />
      <Route path="/user/messages" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/user/ai-chat" element={<ProtectedRoute><AiChatPage /></ProtectedRoute>} />
      <Route path="/user/live" element={<ProtectedRoute><LiveLobbyPage /></ProtectedRoute>} />
      <Route path="/user/live/:liveSessionId" element={<ProtectedRoute><LiveRoomPage /></ProtectedRoute>} />
      <Route path="/user/live/:liveSessionId/buy-question" element={<ProtectedRoute><LiveQuestionPurchasePage /></ProtectedRoute>} />
      <Route path="/user/live/:liveSessionId/submit-question" element={<ProtectedRoute><SubmitLiveQuestionPage /></ProtectedRoute>} />

      {/* New Feature Pages - User */}
      <Route path="/user/horoscope" element={<ProtectedRoute><DailyHoroscopePage /></ProtectedRoute>} />
      <Route path="/user/astrologers/:astrologerId/reviews" element={<ProtectedRoute><AstrologerReviewsPage /></ProtectedRoute>} />
      <Route path="/user/consultation-history" element={<ProtectedRoute><ConsultationHistoryPage /></ProtectedRoute>} />
      <Route path="/user/notifications-bell" element={<ProtectedRoute><UserNotificationBellPage /></ProtectedRoute>} />
      <Route path="/user/muhurtham" element={<ProtectedRoute><MuhurthamPage /></ProtectedRoute>} />

      {/* Astrologer Auth */}
      <Route path="/astrologer/register" element={<AstrologerRegister />} />
      <Route path="/astrologer/login" element={<AstrologerLogin />} />
      <Route path="/astrologer/forgot-password" element={<ForgotPasswordPage astrologer />} />
      <Route path="/astrologer/onboarding" element={<AstrologerOnboardingPage />} />
      <Route path="/astrologer/sessions" element={<ActiveSessionsPage />} />

      {/* Astrologer Pages (Protected) */}
      <Route path="/astrologer/dashboard" element={<ProtectedRoute><Dashboard astrologer /></ProtectedRoute>} />
      <Route path="/astrologer/profile" element={<Navigate to="/astrologer/profile/edit" replace />} />
      <Route path="/astrologer/profile/edit" element={<ProtectedRoute><AstrologerProfileEditPage /></ProtectedRoute>} />
      <Route path="/astrologer/text-question-sales" element={<ProtectedRoute><TextQuestionSalesPage /></ProtectedRoute>} />
      <Route path="/astrologer/questions" element={<ProtectedRoute><AnswerQuestionsPage /></ProtectedRoute>} />
      <Route path="/astrologer/wallet" element={<ProtectedRoute><AstrologerWalletPage /></ProtectedRoute>} />
      <Route path="/astrologer/earnings" element={<ProtectedRoute><EscrowDashboardPage /></ProtectedRoute>} />
      <Route path="/astrologer/appointments" element={<ProtectedRoute><AstrologerAppointmentsPage /></ProtectedRoute>} />
      <Route path="/astrologer/audience" element={<ProtectedRoute><AstrologerAudienceDashboardPage /></ProtectedRoute>} />
      <Route path="/astrologer/audience/handling" element={<ProtectedRoute><AstrologerAudienceHandlingPage /></ProtectedRoute>} />
      <Route path="/astrologer/audience/crm" element={<ProtectedRoute><AstrologerSubscriberCrmPage /></ProtectedRoute>} />
      <Route path="/astrologer/perks/content" element={<ProtectedRoute><AstrologerPerksCreatePage /></ProtectedRoute>} />
      <Route path="/astrologer/analytics" element={<ProtectedRoute><AstrologerAnalyticsPage /></ProtectedRoute>} />
      <Route path="/astrologer/messages" element={<ProtectedRoute><AstrologerChatPage /></ProtectedRoute>} />
      <Route path="/astrologer/live" element={<ProtectedRoute><AstrologerLiveDashboardPage /></ProtectedRoute>} />
      <Route path="/astrologer/live/create" element={<ProtectedRoute><CreateLiveSessionPage /></ProtectedRoute>} />
      <Route path="/astrologer/live/:liveSessionId/room" element={<ProtectedRoute><LiveSessionRoomPage /></ProtectedRoute>} />
      <Route path="/astrologer/contents" element={<ProtectedRoute><AstrologerContentListPage /></ProtectedRoute>} />
      <Route path="/astrologer/contents/create" element={<ProtectedRoute><AstrologerContentCreatePage /></ProtectedRoute>} />
      <Route path="/astrologer/contents/edit/:contentId" element={<ProtectedRoute><AstrologerContentCreatePage /></ProtectedRoute>} />
      <Route path="/astrologer/contents/:contentId/analytics" element={<ProtectedRoute><AstrologerContentListPage /></ProtectedRoute>} />

      {/* Atonement / Remedy Flow */}
      <Route path="/astrologer/atonements/dashboard" element={<ProtectedRoute><AtonementDashboardPage /></ProtectedRoute>} />
      <Route path="/astrologer/atonements/new" element={<ProtectedRoute><IndividualAtonementTrackingPage /></ProtectedRoute>} />
      <Route path="/astrologer/atonements/:atonementId" element={<ProtectedRoute><IndividualAtonementTrackingPage /></ProtectedRoute>} />
      <Route path="/astrologer/atonements/revenue" element={<ProtectedRoute><AtonementRevenuePage /></ProtectedRoute>} />
      <Route path="/astrologer/atonements/discount-codes" element={<ProtectedRoute><DiscountCodeManagementPage /></ProtectedRoute>} />

      {/* Subscription Plan Management */}
      <Route path="/astrologer/subscription-plans" element={<ProtectedRoute><AstrologerSubscriptionPlansPage /></ProtectedRoute>} />

      {/* Accounts / Staff Management */}
      <Route path="/astrologer/accounts" element={<ProtectedRoute><AccountsManagementPage /></ProtectedRoute>} />
      <Route path="/astrologer/accounts/add-staff" element={<ProtectedRoute><AddStaffPage /></ProtectedRoute>} />
      <Route path="/astrologer/accounts/staff/:staffId" element={<ProtectedRoute><StaffDetailPage /></ProtectedRoute>} />
      <Route path="/astrologer/accounts/activity-logs" element={<ProtectedRoute><ActivityLogsPage /></ProtectedRoute>} />
      <Route path="/astrologer/accounts/kill-switch" element={<ProtectedRoute><KillSwitchPage /></ProtectedRoute>} />

      {/* Free Calculations */}
      <Route path="/user/free-calculations" element={<FreeCalculationsPage />} />
      <Route path="/user/free-calculations/numerology" element={<NumerologyPage />} />
      <Route path="/user/free-calculations/birth-chart" element={<BirthChartPage />} />
      <Route path="/user/free-calculations/nakshatra" element={<NakshatraPage />} />
      <Route path="/user/free-calculations/dasha" element={<DasaBhuktiPage />} />
      <Route path="/user/free-calculations/marriage-matching" element={<MarriageMatchingPage />} />
      <Route path="/user/free-calculations/panchang" element={<PanchangPage />} />
      <Route path="/user/free-calculations/baby-names" element={<BabyNamePage />} />

      {/* Content Creation Flow */}
      <Route path="/user/contents/free-information" element={<UserFreeInformationPage />} />
      <Route path="/user/contents/perks" element={<ProtectedRoute><UserPerksPage /></ProtectedRoute>} />
      <Route path="/user/contents/:contentId" element={<ProtectedRoute><UserContentDetailPage /></ProtectedRoute>} />

      {/* Atonement / Remedy Flow */}
      <Route path="/user/atonements" element={<ProtectedRoute><UserAtonementHistoryPage /></ProtectedRoute>} />
      <Route path="/user/atonements/:atonementId" element={<ProtectedRoute><UserAtonementDetailPage /></ProtectedRoute>} />

      {/* Dispute Flow */}
      <Route path="/user/disputes" element={<ProtectedRoute><UserDisputeListPage /></ProtectedRoute>} />
      <Route path="/user/disputes/:disputeId" element={<ProtectedRoute><UserDisputeDetailPage /></ProtectedRoute>} />
      <Route path="/astrologer/disputes" element={<ProtectedRoute><AstrologerDisputePage /></ProtectedRoute>} />

      {/* Emergency Call Flow */}
      <Route path="/user/emergency-calls" element={<ProtectedRoute><UserEmergencyCallsPage /></ProtectedRoute>} />
      <Route path="/astrologer/emergency" element={<ProtectedRoute><AstrologerEmergencyPage /></ProtectedRoute>} />

      {/* New Feature Pages - Astrologer */}
      <Route path="/astrologer/schedule" element={<ProtectedRoute><AstrologerSchedulePage /></ProtectedRoute>} />
      <Route path="/astrologer/earnings-overview" element={<ProtectedRoute><AstrologerEarningsPage /></ProtectedRoute>} />
      <Route path="/astrologer/wallet/withdraw" element={<ProtectedRoute><AstrologerWithdrawalPage /></ProtectedRoute>} />
      <Route path="/astrologer/templates" element={<ProtectedRoute><AstrologerTemplatesPage /></ProtectedRoute>} />
      <Route path="/astrologer/client-notes" element={<ProtectedRoute><AstrologerClientNotesPage /></ProtectedRoute>} />
      <Route path="/astrologer/profile-completion" element={<ProtectedRoute><AstrologerProfileCompletionPage /></ProtectedRoute>} />
      <Route path="/astrologer/reviews" element={<ProtectedRoute><AstrologerReviewManagementPage /></ProtectedRoute>} />

      {/* Profile Management */}
      <Route path="/user/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
      <Route path="/user/profile/edit" element={<ProtectedRoute><UserProfileEditPage /></ProtectedRoute>} />
      <Route path="/user/profile/family/add" element={<ProtectedRoute><UserFamilyProfileFormPage /></ProtectedRoute>} />
      <Route path="/user/profile/family/:profileId/edit" element={<ProtectedRoute><UserFamilyProfileFormPage /></ProtectedRoute>} />
      <Route path="/astrologer/profile/preview" element={<ProtectedRoute><AstrologerProfilePreviewPage /></ProtectedRoute>} />

    </Routes>
  );
}
