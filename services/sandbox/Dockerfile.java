FROM eclipse-temurin:21-jdk

RUN useradd -m -s /bin/bash -u 1000 runner
WORKDIR /sandbox
RUN chown runner:runner /sandbox

COPY runner/run_java.sh /sandbox/run.sh
RUN chmod +x /sandbox/run.sh

USER runner

ENTRYPOINT ["/sandbox/run.sh"]
