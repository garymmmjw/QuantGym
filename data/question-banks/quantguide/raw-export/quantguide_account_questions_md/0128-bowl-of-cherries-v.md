# QuantGuide Question

## 128. Bowl of Cherries V

**Metadata**

- ID: `1NSnAQ4fuUqWAlEL0o41`
- URL: https://www.quantguide.io/questions/bowl-of-cherries-v
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Events, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-12 13:59:46 America/New_York
- Last Edited By: Gabe

### 题干

There are two red cherries and five purple cherries in bowl $A$. There are six red cherries and three purple cherries in bowl $B$. If possible, Jenny randomly transfers a cherry from bowl $B$ into bowl $A$. Then, she randomly picks a cherry from bowl $A$ to eat. She repeats this process until all cherries are eaten. What is the probability that the last cherry she eats is red? Round your answer to 5 decimal places.

### Hint

First approach this problem by considering similar-colored cherries as distinguishable. Treat your bowls as sets such that:
\[\begin{aligned}
    A &= \{r_1, r_2, p_1, p_2, p_3, p_4, p_5\}, \\
    B &= \{r_3, r_4, r_5, r_6, r_7, r_8, p_6, p_7, p_8\}.
\end{aligned}\]

What is the the probability that $r_1$ is eaten last?

### 解答

Let's first approach this problem by considering similar-colored cherries as distinguishable. Treating our bowls as sets, we have:\[\begin{aligned}    A &= \{r_1, r_2, p_1, p_2, p_3, p_4, p_5\}, \\    B &= \{r_3, r_4, r_5, r_6, r_7, r_8, p_6, p_7, p_8\}.\end{aligned}\]Let's find the probability that $r_1$ is eaten last (we will denote this event $R_1$). In order for $r_1$ to be eaten last, we need to eat $15$ cherries that are not $r_1$. Note that there are $8$ cherries to choose from in bowl $A$ until the $10$th round, which is when bowl $B$ is empty. Thus, \[\begin{aligned}\mathbb{P}(R_1) &= \left( \frac{7}{8} \right)^9 \left( \frac{6}{7} \cdot \frac{5}{6} \cdot \ldots \cdot \frac{1}{2} \right) \\&= \left( \frac{7}{8} \right)^9 \cdot \frac{1}{7}\end{aligned}\]The probability that $r_3$ is eaten last (we will denote this event with $R_3$) is trickier to compute. Let $S_k$ denote the event that $r_3$ is the $k$-th cherry transferred from $B$ to $A$. Since each arrangement of the $9$ cherries in bowl $B$ occur with equal probability, $\mathbb{P}(S_k) = \frac{1}{9}$ for all $k \in \{1, \ldots, 9\}$. Note that if $S_k$, then there are $9 - k$ cherries remaining in bowl $B$ once $r_3$ is in bowl $A$. And once $r_3$ is in bowl $A$, we have a very similar problem to finding $\mathbb{P}(R_1)$. \[\begin{aligned}    \mathbb{P}(R_3 | S_1) &= \left( \frac{7}{8} \right)^8 \left( \frac{7}{8} \cdot \frac{6}{7} \cdot \ldots \cdot \frac{1}{2} \right)  \\    &= \left( \frac{7}{8} \right)^8 \cdot \frac{1}{8} \\    \mathbb{P}(R_3 | S_2) &= \left( \frac{7}{8} \right)^7 \cdot \frac{1}{8} \\    &\vdots \\    \mathbb{P}(R_3 | S_9) &= \left( \frac{7}{8} \right)^0 \cdot \frac{1}{8} \\    &= \frac{1}{8}\end{aligned}\]We can now compute $\mathbb{P}(R_3)$ using the law of total probability. \[\begin{aligned}    \mathbb{P}(R_3) &= \sum_{k = 1}^9 \mathbb{P}(R_3 \cap S_k) \\    &= \sum_{k = 1}^9 \mathbb{P}(R_3 | S_k) \mathbb{P}(S_k)\\     &= \frac{1}{8} \sum_{k = 1}^9 \mathbb{P}(R_3 | S_k) \\    &= \frac{1}{8 \cdot 9} \left( \sum_{k = 1}^9 \left( \frac{7}{8} \right)^{k-1} \right)\end{aligned}\]The summation can be computed as follows:\[\begin{aligned}    \sum_{k = 1}^9 \left( \frac{7}{8} \right)^{k-1} &= \frac{1 \left((1 - \left(\frac{7}{8}\right)^9 \right)}{1 - \frac{7}{8}} \\    &= 8 \left(1 - \left(\frac{7}{8}\right)^9 \right)\end{aligned}\] Substituting, we find\[\begin{aligned}\mathbb{P}(R_3) &= \frac{1}{9} \left(1 - \left(\frac{7}{8}\right)^9 \right)\end{aligned}\]We define $R_2$ in a similar way to $R_1$, and we define $R_4, \ldots, R_8$ in a similar way to $R_3$. By symmetry, \[\begin{aligned}\mathbb{P}(R_1) &= \mathbb{P}(R_2), \quad\text{and} \\\mathbb{P}(R_3) &= \mathbb{P}(R_4) = \cdots = \mathbb{P}(R_8).\end{aligned}\]$R_1, R_2, \ldots, R_8$ are mutually exclusive events, meaning that we are free to use countable additivity. So, the probability of eating a red cherry last is\[\begin{aligned}    \mathbb{P}\left( \bigcup_{k = 1}^8 R_k \right) &= \sum_{k = 1}^8 \mathbb{P} \left( R_k \right) \\    &= \frac{2}{7}  \left( \frac{7}{8} \right)^9 + \frac{2}{3} \left(1 - \left(\frac{7}{8}\right)^9 \right) \\    &= \frac{27789631}{50331648} \end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.55213"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "1NSnAQ4fuUqWAlEL0o41",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-12 13:59:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 892390,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bowl of Cherries V",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-v",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "1NSnAQ4fuUqWAlEL0o41",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bowl of Cherries V",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-v"
  }
}
```
