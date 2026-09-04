import { Modal } from './Modal';

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How to play" onClose={onClose}>
      <p>
        Seven words form a ladder. The top and bottom are given — fill in the five in between.
      </p>
      <p>
        Every neighbouring pair, read downward, makes a compound word or a common two-word phrase.
      </p>

      <div className="example" aria-hidden="true">
        <span>fire</span>
        <span className="fill">engine</span>
        <span className="fill">room</span>
      </div>

      <p>
        <code>fire engine</code>, then <code>engine room</code>. Order matters — the pair only has
        to work downward.
      </p>

      <ol>
        <li>Type a guess for the highlighted rung, or tap any other rung to jump to it.</li>
        <li>Each wrong guess locks in one more starting letter of that rung.</li>
        <li>
          Locked letters are yours — you never type them again, only the letters that
          follow.
        </li>
        <li>
          Before a rung has any locked letters, a guess that solves a different open rung
          counts too.
        </li>
      </ol>

      <p>
        You score 1,000 to start. Wrong guesses cost 25, revealed letters cost 60, and finishing
        quickly earns up to 300 back. A new chain arrives every day at midnight New York time.
      </p>
    </Modal>
  );
}
