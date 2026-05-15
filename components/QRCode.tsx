interface Props {
  svg: string;
  url: string;
}

export function QRCode({ svg, url }: Props) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="w-full max-w-md rounded-md border border-slate-200 bg-white p-4 [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="break-all text-center font-mono text-sm text-slate-500">{url}</p>
    </div>
  );
}
