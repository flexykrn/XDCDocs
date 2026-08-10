import Footer from '@theme-original/DocItem/Footer';
import FeedbackWidget from '@site/src/components/Feedback';
import RelatedPages from '@site/src/components/RelatedPages';
import NextSteps from '@site/src/components/NextSteps';
import CopyMarkdown from '@site/src/components/CopyMarkdown';
export default function FooterWrapper(props: Record<string, unknown>) {
  return (
    <>
      <CopyMarkdown />
      <RelatedPages />
      <NextSteps />
      <FeedbackWidget />
      <Footer {...props} />
    </>
  );
}
