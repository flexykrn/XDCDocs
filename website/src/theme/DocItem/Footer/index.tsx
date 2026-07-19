import Footer from '@theme-original/DocItem/Footer';
import FeedbackWidget from '@site/src/components/Feedback';
import type {ComponentType} from 'react';

export default function FooterWrapper(props: Parameters<ComponentType<any>>[0]) {
  return (
    <>
      <FeedbackWidget />
      <Footer {...props} />
    </>
  );
}
