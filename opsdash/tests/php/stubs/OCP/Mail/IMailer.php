<?php

declare(strict_types=1);

namespace OCP\Mail;

interface IMailer {
	public function createEMailTemplate(string $templateId);
	public function createMessage();
	public function send($message);
}
