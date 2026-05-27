# QuantGuide Question

## 206. Birthday Guessing

**Metadata**

- ID: `WxAMf6uQYBVmBXwore7m`
- URL: https://www.quantguide.io/questions/birthday-guessing
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:24:31 America/New_York
- Last Edited By: Gabe

### 题干

A group of colleagues know that their manager Alice's birthday is one of the following 10 dates: $$ \newline \textrm{March 4, March 5, March 8} \newline \textrm{June 4, June 7} \newline \textrm{September 1, September 5} \newline \textrm{December 1, December 2, December 8} \newline$$ Alice only told Bob the month of her birthday and Charlie the day. After that, Bob first said, "I know that neither I nor Charlie knows Alice's birthday." After hearing this, Charlie replies, "I didn't know Alice's birthday, but now I do!" Bob smiles gently, and comments, "Now I do, as well!" What is Alice's birthday (as an integer in the format mmdd, including any leading zeros)?

### Hint

Follow the point of views of Bob and Charlie to understand what they know and don't know, and reduce the possible solution set based on this information.

### 解答

Let $D \in \{1,2,4,5,7,8\}$ be the day of the month of Alice's birthday. If Alice's birthday is on a unique day, then Charlie will know Alice's birthday immediately. Considering that Bob is sure that Charlie does not know Alice's birthday, you must infer that the day Charlie was told is not 2 or 7, and thus the month is not June or December. Now Charlie knows that the month must be either March or September. He immediately figures out Alice's birthday, which means that the day must be unique in the March and September set of dates. In other words, Alice's birthday cannot be March 5 or September 5, but instead be one of March 4, March 8, or September 1. Among these three possibilities, March 4 and March 8 have the same month. If the month Bob had was March, then he would not have been able to figure out Alice's birthday. Thus, Alice's birthday must be September 1.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0901"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "WxAMf6uQYBVmBXwore7m",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:24:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1588041,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Birthday Guessing",
    "topic": "brainteasers",
    "urlEnding": "birthday-guessing",
    "version": 2
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "WxAMf6uQYBVmBXwore7m",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Birthday Guessing",
    "topic": "brainteasers",
    "urlEnding": "birthday-guessing"
  }
}
```
