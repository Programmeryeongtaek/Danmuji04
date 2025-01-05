import { ButtonHTMLAttributes } from 'react';

const Button = ({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      className={`w-full rounded-lg bg-gradient-to-r from-gold-start to-gold-end text-white transition-all duration-300 hover:bg-gradient-to-l hover:from-gold-start hover:to-gold-end disabled:cursor-not-allowed disabled:opacity-50 ${className} `}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
