import { Button } from '@/components/ui/button';

const App = () => {
  return (
    <div className="flex items-center justify-center flex-col min-h-screen">
      <h1 className="text-4xl font-bold underline">Hello, World!</h1>
      <p className="mt-4 text-lg">Welcome to UniChat</p>
      <Button className="mt-6">Click Me</Button>
    </div>
  );
};

export default App;
