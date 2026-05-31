import { serviceDictionary } from "akanjs/dictionary";

import type { AkanEndpoint } from "./akan.signal";

export const dictionary = serviceDictionary(["en", "ko"])
  .endpoint<AkanEndpoint>((fn) => ({}))
  .translate({
    due: ["Due", "마감일"],
    finance: ["Finance", "재무"],
    total: ["Total", "총계"],
    secureDocumentNotice: [
      "The above content is intended solely for the named addressee and may contain trade secret, industrial technology or privileged and confidential information otherwise protected under applicable law including the Unfair Competition Prevention and Trade Secret Protection Act. Any unauthorized dissemination, distribution, copying or use of the information contained in this communication is strictly prohibited. If you have received this content in error, please notify the sender by email and delete this content immediately.",
      "상기 내용은 지정된 수신인만을 위한 것이며 부정경쟁 방지 및 영업비밀 보호에 관한 법률을 포함하여 관련 법령에따라 보호의 대상이 되는 영업비밀, 산업기술 등을 포함하고 있을 수 있습니다. 본 내용에 포함된 정보의 전부 또는 일부를 무단으로 제3자에게 공개, 배포, 복사 또는 사용하는 것은 엄격히 금지 됩니다. 본 내용이 잘못 전송된 경우, 발신인에게 알려 주시고 즉시 삭제하여 주시기 바랍니다.",
    ],
    sendEmailsToRecipients: ["Send emails to recipients below", "아래 수신자에게 이메일을 전송합니다."],
    sender: ["Sender", "발신자"],
    recipient: ["Recipient", "수신자"],
    teamAkan: ["Team Akan", "팀 아칸"],
    teamAddress: ["Korea, Seoul, Gangnam-gu, Eonju-ro 98-gil 16, 4F", "서울시 강남구 언주로 98길 16, 4층"],
    cheatSheet: ["Cheat Sheet", "치트키 쓰기"],
    akanjs: ["Akan.js", "Akan.js"],
    docs: ["Docs", "문서"],
    blog: ["Blog", "블로그"],
    email: ["Email", "이메일"],
    address: ["Address", "주소"],
    businessRegistrationNumber: ["Business Registration No.", "사업자등록번호"],
  });
