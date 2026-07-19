import Navbar from '@theme-original/Navbar';
import SectionTabs from '@site/src/components/SectionTabs';
import type {ComponentType} from 'react';

export default function NavbarWrapper(props: Parameters<ComponentType<any>>[0]) {
  return (
    <>
      <Navbar {...props} />
      <SectionTabs />
    </>
  );
}
