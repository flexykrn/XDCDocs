import Footer from '@theme-original/DocItem/Footer';
import FeedbackWidget from '@site/src/components/Feedback';
export default function FooterWrapper(props: Record<string, unknown>) {
  return (
    <>
      <FeedbackWidget />
      <Footer {...props} />
    </>
  );
}
