# QuantGuide Question

## 971. Party Groups I

**Metadata**

- ID: `1Qzcaj8Qe5ZU89sQkDgw`
- URL: https://www.quantguide.io/questions/party-groups
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Maven Securities, Jane Street
- Source: Kaushik - Maven Glassdoor
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 18:50:53 America/New_York
- Last Edited By: Gabe

### 题干

There are $50$ guests at a party and they are making groups for a game. To do this they each write their name on a piece of paper and put it into a hat. One by one, each guest picks a name from the hat. Each guest will be a part of a group with the guest they pulled the name out of from the hat. If a guest pulls out their own name, they are in a group all by themselves. If Guest A pulls out Guest B's name, Guest B pulls out Guest C's name, and Guest C pulls out Guest A's name, they are all a part of the same closed group and no one else will be able to join them. How many groups will there be on average? Round your answer to the nearest tenth. 

### Hint

Think of this scenario as each guest being a cable extender there the input end is their hand picking a name out of the hat and the output end is the piece of paper with their name on it.

### 解答

You can also think of this scenario as each guest acting like a cable extender. Each cable has an "input" side and an "output" side. When the first guest picks a name and they pick their own name, its like connecting the two ends of the same wire together. Otherwise you are connected two wires together and making one larger wire with one input end and one output end. 
$$$$

A more algebraically-inclined person may want to think of this scenario as the expected number of cycles of a random $50-$permutation.
$$$$
Whichever way you want to think about it, the math stays the same. When the first guest picks a name, there is a $\dfrac{1}{50}$ chance that the number of groups does not change and a $\dfrac{49}{50}$ chance that the number of groups effectively decrease by one (because two groups join together). When the next guest picks a number, the given scenario is very similar whether the first guest formed their own group or connected with another guest. Both scenarios have $49$ groups or "wires". The only difference is that there's one closed group if the first guest picks their own name versus no closed groups if they pick another guest's name. If we keep continuing this for every guest, we add a closed group with probability $\dfrac{1}{k}$ where $k$ are the number of names still left in the hat. 
$$$$
Thus the answer is $$\sum_{n=1}^{50} \frac{1}{n} \approx 4.5$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4.5"
    ],
    "companies": [
      {
        "company": "Maven Securities"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "1Qzcaj8Qe5ZU89sQkDgw",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 18:50:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7924425,
    "randomizable": "",
    "source": "Kaushik - Maven Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Party Groups I",
    "topic": "probability",
    "urlEnding": "party-groups",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Maven Securities"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "1Qzcaj8Qe5ZU89sQkDgw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Party Groups I",
    "topic": "probability",
    "urlEnding": "party-groups"
  }
}
```
