const ErrorNotification = ({
  serverError,
  text,
}: {
  serverError: string | null;
  text?: string;
}) => {
  return (
    <>
      {/* SERVER ERROR */}
      {serverError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2 animate-in fade-in slide-in-from-top zoom-in-95 duration-300">
          <span className="font-semibold">{text || "Error:"}</span>
          <span>{serverError}</span>
        </div>
      )}
    </>
  );
};

export default ErrorNotification;
