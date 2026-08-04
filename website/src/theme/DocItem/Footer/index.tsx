import Footer from '@theme-original/DocItem/Footer';
import FeedbackWidget from '@site/src/components/Feedback';
import RelatedPages from '@site/src/components/RelatedPages';
import NextSteps from '@site/src/components/NextSteps';
export default function FooterWrapper(props: Record<string, unknown>) {
  return (
    <>
      <RelatedPages />
      <NextSteps />
      <FeedbackWidget />
      <Footer {...props} />
    </>
  );
}
