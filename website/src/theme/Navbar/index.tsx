import Navbar from '@theme-original/Navbar';
import SectionTabs from '@site/src/components/SectionTabs';
export default function NavbarWrapper(props: Record<string, unknown>) {
  return (
    <>
      <Navbar {...props} />
      <SectionTabs />
    </>
  );
}
